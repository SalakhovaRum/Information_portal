(function() {
    'use strict';
    var DateTimeShortcuts = {
        calendars: [],
        calendarInputs: [],
        clockInputs: [],
        clockHours: {
            default_: [
                [gettext_noop('Now'), -1],
                [gettext_noop('Midnight'), 0],
                [gettext_noop('6 a.m.'), 6],
                [gettext_noop('Noon'), 12],
                [gettext_noop('6 p.m.'), 18]
            ]
        },
        dismissClockFunc: [],
        dismissCalendarFunc: [],
        calendarDivName1: 'calendarbox', // имя календаря <div>, который переключается
        calendarDivName2: 'calendarin', // имя <div>, содержащего календарь
        calendarLinkName: 'calendarlink', // название ссылки, которая используется для переключения
        clockDivName: 'clockbox', // имя часов <div>, которые переключаются
        clockLinkName: 'clocklink', // название ссылки, которая используется для переключения
        shortCutsClass: 'datetimeshortcuts', // класс сочетаний клавиш clock и calc
        timezoneWarningClass: 'timezonewarning', // класс предупреждения о несоответствии часового пояса
        timezoneOffset: 0,
        init: function() {
            var body = document.getElementsByTagName('body')[0];
            var serverOffset = body.getAttribute('data-admin-utc-offset');
            if (serverOffset) {
                var localOffset = new Date().getTimezoneOffset() * -60;
                DateTimeShortcuts.timezoneOffset = localOffset - serverOffset;
            }

            var inputs = document.getElementsByTagName('input');
            for (var i = 0; i < inputs.length; i++) {
                var inp = inputs[i];
                if (inp.getAttribute('type') === 'text' && inp.className.match(/vTimeField/)) {
                    DateTimeShortcuts.addClock(inp);
                    DateTimeShortcuts.addTimezoneWarning(inp);
                }
                else if (inp.getAttribute('type') === 'text' && inp.className.match(/vDateField/)) {
                    DateTimeShortcuts.addCalendar(inp);
                    DateTimeShortcuts.addTimezoneWarning(inp);
                }
            }
        },
        // Возвращает текущее время с учетом часового пояса сервера.
        now: function() {
            var body = document.getElementsByTagName('body')[0];
            var serverOffset = body.getAttribute('data-admin-utc-offset');
            if (serverOffset) {
                var localNow = new Date();
                var localOffset = localNow.getTimezoneOffset() * -60;
                localNow.setTime(localNow.getTime() + 1000 * (serverOffset - localOffset));
                return localNow;
            } else {
                return new Date();
            }
        },
        // Добавьте предупреждение, когда часовой пояс в браузере и серверной части не совпадают.
        addTimezoneWarning: function(inp) {
            var warningClass = DateTimeShortcuts.timezoneWarningClass;
            var timezoneOffset = DateTimeShortcuts.timezoneOffset / 3600;

            // Предупреждайте только в случае несоответствия часового пояса.
            if (!timezoneOffset) {
                return;
            }

            // Проверьте, есть ли уже предупреждение.
            if (inp.parentNode.querySelectorAll('.' + warningClass).length) {
                return;
            }

            var message;
            if (timezoneOffset > 0) {
                message = ngettext(
                    'Note: You are %s hour ahead of server time.',
                    'Note: You are %s hours ahead of server time.',
                    timezoneOffset
                );
            }
            else {
                timezoneOffset *= -1;
                message = ngettext(
                    'Note: You are %s hour behind server time.',
                    'Note: You are %s hours behind server time.',
                    timezoneOffset
                );
            }
            message = interpolate(message, [timezoneOffset]);

            var warning = document.createElement('span');
            warning.className = warningClass;
            warning.textContent = message;
            inp.parentNode.appendChild(document.createElement('br'));
            inp.parentNode.appendChild(warning);
        },
        // Добавить виджет часов в заданное поле
        addClock: function(inp) {
            var num = DateTimeShortcuts.clockInputs.length;
            DateTimeShortcuts.clockInputs[num] = inp;
            DateTimeShortcuts.dismissClockFunc[num] = function() { DateTimeShortcuts.dismissClock(num); return true; };

            // Быстрые ссылки (значок часов и ссылка "Сейчас")
            var shortcuts_span = document.createElement('span');
            shortcuts_span.className = DateTimeShortcuts.shortCutsClass;
            inp.parentNode.insertBefore(shortcuts_span, inp.nextSibling);
            var now_link = document.createElement('a');
            now_link.setAttribute('href', "#");
            now_link.textContent = gettext('Now');
            now_link.addEventListener('click', function(e) {
                e.preventDefault();
                DateTimeShortcuts.handleClockQuicklink(num, -1);
            });
            var clock_link = document.createElement('a');
            clock_link.setAttribute('href', '#');
            clock_link.id = DateTimeShortcuts.clockLinkName + num;
            clock_link.addEventListener('click', function(e) {
                e.preventDefault();
                // avoid triggering the document click handler to dismiss the clock
                e.stopPropagation();
                DateTimeShortcuts.openClock(num);
            });

            quickElement(
                'span', clock_link, '',
                'class', 'clock-icon',
                'title', gettext('Choose a Time')
            );
            shortcuts_span.appendChild(document.createTextNode('\u00A0'));
            shortcuts_span.appendChild(now_link);
            shortcuts_span.appendChild(document.createTextNode('\u00A0|\u00A0'));
            shortcuts_span.appendChild(clock_link);

            // Create clock link div
            //
            // Markup looks like:
            // <div id="clockbox1" class="clockbox module">
            //     <h2>Choose a time</h2>
            //     <ul class="timelist">
            //         <li><a href="#">Now</a></li>
            //         <li><a href="#">Midnight</a></li>
            //         <li><a href="#">6 a.m.</a></li>
            //         <li><a href="#">Noon</a></li>
            //         <li><a href="#">6 p.m.</a></li>
            //     </ul>
            //     <p class="calendar-cancel"><a href="#">Cancel</a></p>
            // </div>

            var clock_box = document.createElement('div');
            clock_box.style.display = 'none';
            clock_box.style.position = 'absolute';
            clock_box.className = 'clockbox module';
            clock_box.setAttribute('id', DateTimeShortcuts.clockDivName + num);
            document.body.appendChild(clock_box);
            clock_box.addEventListener('click', function(e) { e.stopPropagation(); });

            quickElement('h2', clock_box, gettext('Choose a time'));
            var time_list = quickElement('ul', clock_box);
            time_list.className = 'timelist';
            // The list of choices can be overridden in JavaScript like this:
            // DateTimeShortcuts.clockHours.name = [['3 a.m.', 3]];
            // where name is the name attribute of the <input>.
            var name = typeof DateTimeShortcuts.clockHours[inp.name] === 'undefined' ? 'default_' : inp.name;
            DateTimeShortcuts.clockHours[name].forEach(function(element) {
                var time_link = quickElement('a', quickElement('li', time_list), gettext(element[0]), 'href', '#');
                time_link.addEventListener('click', function(e) {
                    e.preventDefault();
                    DateTimeShortcuts.handleClockQuicklink(num, element[1]);
                });
            });

            var cancel_p = quickElement('p', clock_box);
            cancel_p.className = 'calendar-cancel';
            var cancel_link = quickElement('a', cancel_p, gettext('Cancel'), 'href', '#');
            cancel_link.addEventListener('click', function(e) {
                e.preventDefault();
                DateTimeShortcuts.dismissClock(num);
            });

            document.addEventListener('keyup', function(event) {
                if (event.which === 27) {
                    // ESC key closes popup
                    DateTimeShortcuts.dismissClock(num);
                    event.preventDefault();
                }
            });
        },
        openClock: function(num) {
            var clock_box = document.getElementById(DateTimeShortcuts.clockDivName + num);
            var clock_link = document.getElementById(DateTimeShortcuts.clockLinkName + num);

            // Пересчитайте положение часового механизма
            // is it left-to-right or right-to-left layout ?
            if (getStyle(document.body, 'direction') !== 'rtl') {
                clock_box.style.left = findPosX(clock_link) + 17 + 'px';
            }
            else {
                // поскольку ширина стиля выражена в em, вычислить ее было бы сложно
                // его значение в пикселях. давайте пока воспользуемся приблизительным значением px
                // TODO: IE returns wrong value for findPosX when in rtl mode
                //       (it returns as it was left aligned), needs to be fixed.
                clock_box.style.left = findPosX(clock_link) - 110 + 'px';
            }
            clock_box.style.top = Math.max(0, findPosY(clock_link) - 30) + 'px';

            // Покажите коробку с часами
            clock_box.style.display = 'block';
            document.addEventListener('click', DateTimeShortcuts.dismissClockFunc[num]);
        },
        dismissClock: function(num) {
            document.getElementById(DateTimeShortcuts.clockDivName + num).style.display = 'none';
            document.removeEventListener('click', DateTimeShortcuts.dismissClockFunc[num]);
        },
        handleClockQuicklink: function(num, val) {
            var d;
            if (val === -1) {
                d = DateTimeShortcuts.now();
            }
            else {
                d = new Date(1970, 1, 1, val, 0, 0, 0);
            }
            DateTimeShortcuts.clockInputs[num].value = d.strftime(get_format('TIME_INPUT_FORMATS')[0]);
            DateTimeShortcuts.clockInputs[num].focus();
            DateTimeShortcuts.dismissClock(num);
        },
        // Добавьте виджет календаря в заданное поле.
        addCalendar: function(inp) {
            var num = DateTimeShortcuts.calendars.length;

            DateTimeShortcuts.calendarInputs[num] = inp;
            DateTimeShortcuts.dismissCalendarFunc[num] = function() { DateTimeShortcuts.dismissCalendar(num); return true; };

            // Быстрые ссылки (значок календаря и ссылка "Сегодня")
            var shortcuts_span = document.createElement('span');
            shortcuts_span.className = DateTimeShortcuts.shortCutsClass;
            inp.parentNode.insertBefore(shortcuts_span, inp.nextSibling);
            var today_link = document.createElement('a');
            today_link.setAttribute('href', '#');
            today_link.appendChild(document.createTextNode(gettext('Today')));
            today_link.addEventListener('click', function(e) {
                e.preventDefault();
                DateTimeShortcuts.handleCalendarQuickLink(num, 0);
            });
            var cal_link = document.createElement('a');
            cal_link.setAttribute('href', '#');
            cal_link.id = DateTimeShortcuts.calendarLinkName + num;
            cal_link.addEventListener('click', function(e) {
                e.preventDefault();
                // избегайте запуска обработчика щелчков по документу для закрытия календаря
                e.stopPropagation();
                DateTimeShortcuts.openCalendar(num);
            });
            quickElement(
                'span', cal_link, '',
                'class', 'date-icon',
                'title', gettext('Choose a Date')
            );
            shortcuts_span.appendChild(document.createTextNode('\u00A0'));
            shortcuts_span.appendChild(today_link);
            shortcuts_span.appendChild(document.createTextNode('\u00A0|\u00A0'));
            shortcuts_span.appendChild(cal_link);

            // Create calendarbox div.
            //
            // Markup looks like:
            //
            // <div id="calendarbox3" class="calendarbox module">
            //     <h2>
            //           <a href="#" class="link-previous">&lsaquo;</a>
            //           <a href="#" class="link-next">&rsaquo;</a> February 2003
            //     </h2>
            //     <div class="calendar" id="calendarin3">
            //         <!-- (cal) -->
            //     </div>
            //     <div class="calendar-shortcuts">
            //          <a href="#">Yesterday</a> | <a href="#">Today</a> | <a href="#">Tomorrow</a>
            //     </div>
            //     <p class="calendar-cancel"><a href="#">Cancel</a></p>
            // </div>
            var cal_box = document.createElement('div');
            cal_box.style.display = 'none';
            cal_box.style.position = 'absolute';
            cal_box.className = 'calendarbox module';
            cal_box.setAttribute('id', DateTimeShortcuts.calendarDivName1 + num);
            document.body.appendChild(cal_box);
            cal_box.addEventListener('click', function(e) { e.stopPropagation(); });

            // ссылки на следующую-предыдущую
            var cal_nav = quickElement('div', cal_box);
            var cal_nav_prev = quickElement('a', cal_nav, '<', 'href', '#');
            cal_nav_prev.className = 'calendarnav-previous';
            cal_nav_prev.addEventListener('click', function(e) {
                e.preventDefault();
                DateTimeShortcuts.drawPrev(num);
            });

            var cal_nav_next = quickElement('a', cal_nav, '>', 'href', '#');
            cal_nav_next.className = 'calendarnav-next';
            cal_nav_next.addEventListener('click', function(e) {
                e.preventDefault();
                DateTimeShortcuts.drawNext(num);
            });

            // main box
            var cal_main = quickElement('div', cal_box, '', 'id', DateTimeShortcuts.calendarDivName2 + num);
            cal_main.className = 'calendar';
            DateTimeShortcuts.calendars[num] = new Calendar(DateTimeShortcuts.calendarDivName2 + num, DateTimeShortcuts.handleCalendarCallback(num));
            DateTimeShortcuts.calendars[num].drawCurrent();

            // ярлыки календаря
            var shortcuts = quickElement('div', cal_box);
            shortcuts.className = 'calendar-shortcuts';
            var day_link = quickElement('a', shortcuts, gettext('Yesterday'), 'href', '#');
            day_link.addEventListener('click', function(e) {
                e.preventDefault();
                DateTimeShortcuts.handleCalendarQuickLink(num, -1);
            });
            shortcuts.appendChild(document.createTextNode('\u00A0|\u00A0'));
            day_link = quickElement('a', shortcuts, gettext('Today'), 'href', '#');
            day_link.addEventListener('click', function(e) {
                e.preventDefault();
                DateTimeShortcuts.handleCalendarQuickLink(num, 0);
            });
            shortcuts.appendChild(document.createTextNode('\u00A0|\u00A0'));
            day_link = quickElement('a', shortcuts, gettext('Tomorrow'), 'href', '#');
            day_link.addEventListener('click', function(e) {
                e.preventDefault();
                DateTimeShortcuts.handleCalendarQuickLink(num, +1);
            });

            // cancel bar
            var cancel_p = quickElement('p', cal_box);
            cancel_p.className = 'calendar-cancel';
            var cancel_link = quickElement('a', cancel_p, gettext('Cancel'), 'href', '#');
            cancel_link.addEventListener('click', function(e) {
                e.preventDefault();
                DateTimeShortcuts.dismissCalendar(num);
            });
            document.addEventListener('keyup', function(event) {
                if (event.which === 27) {
                    // ESC key closes popup
                    DateTimeShortcuts.dismissCalendar(num);
                    event.preventDefault();
                }
            });
        },
        openCalendar: function(num) {
            var cal_box = document.getElementById(DateTimeShortcuts.calendarDivName1 + num);
            var cal_link = document.getElementById(DateTimeShortcuts.calendarLinkName + num);
            var inp = DateTimeShortcuts.calendarInputs[num];

            // Определите, имеет ли текущее значение во входных данных действительную дату.
            // Если да, нарисуйте календарь с указанием года и месяца этой даты.
            if (inp.value) {
                var format = get_format('DATE_INPUT_FORMATS')[0];
                var selected = inp.value.strptime(format);
                var year = selected.getUTCFullYear();
                var month = selected.getUTCMonth() + 1;
                var re = /\d{4}/;
                if (re.test(year.toString()) && month >= 1 && month <= 12) {
                    DateTimeShortcuts.calendars[num].drawDate(month, year, selected);
                }
            }

            // Пересчитайте положение блока часов
            // is it left-to-right or right-to-left layout ?
            if (getStyle(document.body, 'direction') !== 'rtl') {
                cal_box.style.left = findPosX(cal_link) + 17 + 'px';
            }
            else {
                // since style's width is in em, it'd be tough to calculate
                // px value of it. let's use an estimated px for now
                // TODO: IE returns wrong value for findPosX when in rtl mode
                //       (it returns as it was left aligned), needs to be fixed.
                cal_box.style.left = findPosX(cal_link) - 180 + 'px';
            }
            cal_box.style.top = Math.max(0, findPosY(cal_link) - 75) + 'px';

            cal_box.style.display = 'block';
            document.addEventListener('click', DateTimeShortcuts.dismissCalendarFunc[num]);
        },
        dismissCalendar: function(num) {
            document.getElementById(DateTimeShortcuts.calendarDivName1 + num).style.display = 'none';
            document.removeEventListener('click', DateTimeShortcuts.dismissCalendarFunc[num]);
        },
        drawPrev: function(num) {
            DateTimeShortcuts.calendars[num].drawPreviousMonth();
        },
        drawNext: function(num) {
            DateTimeShortcuts.calendars[num].drawNextMonth();
        },
        handleCalendarCallback: function(num) {
            var format = get_format('DATE_INPUT_FORMATS')[0];
            // the format needs to be escaped a little
            format = format.replace('\\', '\\\\')
                .replace('\r', '\\r')
                .replace('\n', '\\n')
                .replace('\t', '\\t')
                .replace("'", "\\'");
            return function(y, m, d) {
                DateTimeShortcuts.calendarInputs[num].value = new Date(y, m - 1, d).strftime(format);
                DateTimeShortcuts.calendarInputs[num].focus();
                document.getElementById(DateTimeShortcuts.calendarDivName1 + num).style.display = 'none';
            };
        },
        handleCalendarQuickLink: function(num, offset) {
            var d = DateTimeShortcuts.now();
            d.setDate(d.getDate() + offset);
            DateTimeShortcuts.calendarInputs[num].value = d.strftime(get_format('DATE_INPUT_FORMATS')[0]);
            DateTimeShortcuts.calendarInputs[num].focus();
            DateTimeShortcuts.dismissCalendar(num);
        }
    };

    window.addEventListener('load', DateTimeShortcuts.init);
    window.DateTimeShortcuts = DateTimeShortcuts;
})();