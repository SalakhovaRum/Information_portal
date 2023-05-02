import secrets
from django.shortcuts import redirect
from django.views.generic import TemplateView, DetailView, View
from courses.models import Lendet, Lesson, Klasa
from django.shortcuts import render, get_object_or_404
from django.contrib.auth.mixins import LoginRequiredMixin
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from .forms import KlasaForm, LendaForm, MesimiForm


# Create your views here.

class HomeView(TemplateView):
    template_name = 'index.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        category = Klasa.objects.all()
        context['category'] = category
        return context


class AboutView(TemplateView):
    template_name = 'about.html'


class ContactView(TemplateView):
    template_name = 'contact.html'


def CourseListView(request, category):
    courses = Lendet.objects.filter(klasa=category)
    context = {
        'courses': courses
    }
    return render(request, 'courses/course_list.html', context)


class CourseDetailView(DetailView):
    context_object_name = 'course'
    template_name = 'courses/course_detail.html'
    model = Lendet


class LessonDetailView(View, LoginRequiredMixin):
    def get(self, request, course_slug, lesson_slug, *args, **kwargs):
        course = get_object_or_404(Lendet, slug=course_slug)
        lesson = get_object_or_404(Lesson, slug=lesson_slug)
        context = {'lesson': lesson}
        return render(request, "courses/lesson_detail.html", context)


@login_required
def SearchView(request):
    if request.method == 'POST':
        kerko = request.POST.get('search')
        results = Lesson.objects.filter(titulli__contains=kerko)
        context = {
            'results': results
        }
        return render(request, 'courses/search_result.html', context)


@login_required
def krijo_klase(request):
    if not request.user.profile.is_teacher == True:
        messages.error(request, f'Ваша учетная запись не имеет доступа к этому URL, только учетные записи учителей!')
        return redirect('courses:home')
    if request.method == 'POST':
        form = KlasaForm(data=request.POST, files=request.FILES)
        if form.is_valid():
            form.save()
            messages.success(request, f'Ваш класс был создан')
            return redirect('courses:home')
    else:
        form = KlasaForm()
    context = {
        'form': form
    }
    return render(request, 'courses/krijo_klase.html', context)


@login_required
def krijo_lende(request):
    if not request.user.profile.is_teacher == True:
        messages.error(request, f'Ваша учетная запись не имеет доступа к этому URL, только учетные записи учителей!')
        return redirect('courses:home')
    if request.method == 'POST':
        form = LendaForm(request.POST)
        if form.is_valid():
            form.save()
            klasa = form.cleaned_data['Класс']
            slug = klasa.id
            messages.success(request, f'Ваш предмет был создан')
            return redirect('/courses/' + str(slug))
    else:
        form = LendaForm(initial={'krijues': request.user.id, 'slug': secrets.token_hex(nbytes=16)})
    context = {
        'form': form
    }
    return render(request, 'courses/krijo_lende.html', context)


@login_required
def krijo_mesim(request):
    if not request.user.profile.is_teacher == True:
        messages.error(request, f'Ваша учетная запись не имеет доступа к этому URL, только учетные записи учителей!')
        return redirect('courses:home')
    if request.method == 'POST':
        form = MesimiForm(request.POST)
        if form.is_valid():
            form.save()
            lenda = form.cleaned_data['lenda']
            slug = lenda.slug
            messages.success(request, f'Ваш урок был создан')
            return redirect('/courses/' + str(slug))
    else:
        form = MesimiForm(initial={'slug': secrets.token_hex(nbytes=16)})
    context = {
        'form': form
    }
    return render(request, 'courses/krijo_mesim.html', context)


def view_404(request, exception):
    return render(request, '404.html')


def view_403(request, exception):
    return render(request, '403.html')


def view_500(request):
    return render(request, '500.html')

