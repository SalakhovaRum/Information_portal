from django.shortcuts import render,redirect
from blog.models import Post
from django.views.generic import (ListView,DetailView)
from django.contrib import messages

# Create your views here.


class PostListView(ListView):
    context_object_name = 'posts'
    template_name = 'blog/post_list.html'
    ordering = ['-created_date']
    model = Post


class PostDetailView(DetailView):
    context_object_name = 'post'
    template_name = 'blog/post_detail.html'
    model = Post


def create_post(request):
    if request.method == 'POST':
        titulli = request.POST.get('title')
        permbajtja = request.POST.get('text')
        postim = Post(title=titulli, text=permbajtja, author=request.user)
        postim.save()
        messages.success(request, f'Пост успешно создан')
        return redirect('blogs:post_list')
    return render(request, 'blog/create_post.html')


def delete_post(request, id):
    Post(id=id).delete()
    return redirect('blogs:post_list')