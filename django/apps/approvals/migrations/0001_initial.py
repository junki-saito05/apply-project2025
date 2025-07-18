# Generated by Django 5.2.4 on 2025-07-14 14:39

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('departments', '0002_alter_department_level'),
    ]

    operations = [
        migrations.CreateModel(
            name='ApprovalRouteMaster',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=30)),
                ('description', models.CharField(blank=True, max_length=50, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('created_by', models.BigIntegerField()),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('updated_by', models.BigIntegerField()),
                ('deleted_at', models.DateTimeField(blank=True, null=True)),
                ('deleted_by', models.BigIntegerField(blank=True, null=True)),
            ],
            options={
                'verbose_name': '承認ルート',
                'verbose_name_plural': '承認ルート',
                'db_table': 'approval_route_masters',
            },
        ),
        migrations.CreateModel(
            name='ApprovalStepMaster',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('step_number', models.IntegerField()),
                ('position', models.PositiveSmallIntegerField(choices=[(1, '社長'), (2, '事業部長'), (3, '課長'), (4, '一般')])),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('created_by', models.BigIntegerField()),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('updated_by', models.BigIntegerField()),
                ('deleted_at', models.DateTimeField(blank=True, null=True)),
                ('deleted_by', models.BigIntegerField(blank=True, null=True)),
                ('approval_route_master', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='steps', to='approvals.approvalroutemaster')),
                ('department', models.ForeignKey(db_column='department_id', null=True, on_delete=django.db.models.deletion.PROTECT, to='departments.department')),
            ],
            options={
                'verbose_name': '承認ステップ',
                'verbose_name_plural': '承認ステップ',
                'db_table': 'approval_step_masters',
            },
        ),
    ]
