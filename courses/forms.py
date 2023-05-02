from django import forms
from .models import Klasa, Lendet, Lesson


class KlasaForm(forms.ModelForm):
    class Meta:
        model = Klasa
        fields = '__all__'
        help_texts = {
            'titulli': '11 Класс или класс информатики',
            'pershkrimi':'Добавить краткое описание класса',
            'imazhi':'Вы можете добавить фотографию класса или оставить поле пустым'
        }


class LendaForm(forms.ModelForm):
    class Meta:
        model = Lendet
        fields = ['krijues','slug', 'titulli', 'klasa', 'pershkrimi', 'imazhi_lendes']
        help_texts = {
            'titulli': 'Математика, география и т.д',
            'pershkrimi':'Добавить краткое описание предмета',
            'klasa':'Выберите класс, для которого вы хотите создать предмет',
            'imazhi_lendes':'Вы можете добавить фотографию предмета или оставить поле пустым'
        }
        labels = {
            'titulli':'Название предмета'
        }
        widgets = {'krijues': forms.HiddenInput(), 'slug': forms.HiddenInput()}


class MesimiForm(forms.ModelForm):
    class Meta:
        model = Lesson
        fields = ['slug','titulli', 'lenda', 'video_id', 'pozicioni', ]
        help_texts = {
            'titulli':'Добавить заголовок урока',
            'lenda':'Выберите предмет, к которому отноится этот урок',
            'video_id':'Добавьте ID видео с YouTube, которое вы хотите загрузить (<a href="/media/youtube_help.png">ku mund ta gjej ID</a>)',
            'pozicioni':'Добавьте порядковый номер урока '
        }
        widgets = {
            'slug': forms.HiddenInput()
        }