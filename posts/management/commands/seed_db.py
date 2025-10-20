from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from posts.models import Post
import random
from faker import Faker

User = get_user_model()
fake = Faker()

class Command(BaseCommand):
    help = 'Seed the database with random posts'

    def add_arguments(self, parser):
        parser.add_argument('--num-posts', type=int, default=10, help='Number of posts to create')

    def handle(self, *args, **options):
        num_posts = options['num_posts']
        users = list(User.objects.all())
        if not users:
            self.stdout.write(self.style.ERROR('No users found. Please create some users first.'))
            return

        for _ in range(num_posts):
            user = random.choice(users)
            caption = fake.text(max_nb_chars=200)
            post = Post.objects.create(user=user, caption=caption)
            self.stdout.write(self.style.SUCCESS(f'Created post: {post}'))

        self.stdout.write(self.style.SUCCESS(f'Successfully created {num_posts} posts'))
