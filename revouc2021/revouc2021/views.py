from django.http import HttpResponse
from django.template import loader
from django.shortcuts import render, redirect
from django.views.generic import TemplateView

class JoinView(TemplateView):
    template_name = 'index.html'

    def get(self, request):
        return render(request, self.template_name)