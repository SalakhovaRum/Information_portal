from django.contrib.auth.decorators import login_required
from users.forms import profileUpdateForm, userUpdateForm
from users.models import Profile as Pro
from users.models import Kerkesat
from django.contrib import messages
from django.shortcuts import render,redirect
from memberships.models import  UserMembership, Subscription
from django.core.mail import send_mail
# Create your views here.


def get_user_membership(request):
    user_membership_qs = UserMembership.objects.filter(user=request.user)
    if user_membership_qs.exists():
        return user_membership_qs.first()
    return None


def get_user_subscription(request):
    user_subscription_qs = Subscription.objects.filter(user_membership=get_user_membership(request))
    if user_subscription_qs.exists():
        user_subscription = user_subscription_qs.first()
        return user_subscription
    return None


@login_required
def Profile(request):
    user_membership = get_user_membership(request)
    user_subscription = get_user_subscription(request)
    if request.method == 'POST':
        u_form = userUpdateForm(request.POST, instance=request.user)
        p_form = profileUpdateForm(request.POST, request.FILES, instance=request.user.profile)
        if u_form.is_valid() and p_form.is_valid():
            u_form.save()
            p_form.save()
            messages.success(request, 'Ваша учетная запись была успешно обновлена!')
            return redirect('users:profile')
    else:
        u_form = userUpdateForm(instance=request.user)
        p_form = profileUpdateForm(instance=request.user.profile)

    context = {
        'u_form': u_form,
        'p_form': p_form,
        'user_membership': user_membership,
        'user_subscription': user_subscription
    }
    return render(request, 'profile/profile.html', context)


def kerkesa(request):
    if request.method == 'POST':
        emri = request.POST.get('name')
        email = request.POST.get('e-mail')
        numri_tel = request.POST.get('phone')
        prof = request.user.profile
        kerkesa = Kerkesat(profili=prof, emri=emri, email=email, numri_tel=numri_tel)
        kerkesa.save()
        prof_id = prof.id
        Pro.objects.filter(id=prof_id).update(is_teacher=True)

        message = 'Ваш запрос на учетную запись учителя был принят! Теперь вы можете вернуться на MesoOn и загружать курсы, уроки и многое другое!'
        send_mail(
            'MesoOn, ваш запрос был принят',
            message,
            'mesoon@no-reply.com',
            [email],
            fail_silently=False,
        )
        send_mail(
            'MesoOn',
            'Кто-то запросил учетную запись учителя. Более подробная информация: ' + emri + ' , ' + email + ' , ' + numri_tel + ' , ' + str(
                prof) + '.',
            'mesoon@no-reply.com',
            ['redian1marku@gmail.com'],
            fail_silently=False,
        )
        messages.info(request, f'Ваш запрос был успешно отправлен. Вы будете уведомлены по электронной почте.')
        return redirect('courses:home')


