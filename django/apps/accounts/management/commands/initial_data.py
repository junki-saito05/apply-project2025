from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.departments.models import Department
from apps.accounts.models import User

class Command(BaseCommand):
    help = '初期の部門とユーザーを作成する'

    def handle(self, *args, **kwargs):
        # 部門の作成
        if not Department.objects.filter(id=1).exists():
            department = Department(
                id=1,
                name='システム部',
                level=2,
                created_by=1,
                updated_by=1,
                created_at=timezone.now(),
                updated_at=timezone.now(),
            )
            department.save()
            self.stdout.write(self.style.SUCCESS('Department created'))
        else:
            department = Department.objects.get(id=1)
            self.stdout.write('Department already exists')

        # ユーザーの作成
        if not User.objects.filter(id=1).exists():
            user = User(
                id=1,
                username='testuser1',
                email='test@example.com',  # 自身のgmailを入力すれば「Googleでログイン」にも使用できる
                department_id=1,
                position=2,
                has_master_permission=True,
                created_by=1,
                updated_by=1,
                created_at=timezone.now(),
                updated_at=timezone.now(),
            )
            user.set_password('password')
            user.save()
            self.stdout.write(self.style.SUCCESS('User created: testuser1'))
        else:
            self.stdout.write('User testuser1 already exists')
