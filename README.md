# apply-project2025

## 環境構築手順

- Docker 環境での立ち上げを前提とする

1. develop ブランチからローカルにクローンする

2. .env.example をコピーして.env ファイルを作成する

3. frontend ディレクトリ内の`sample.env.local`をコピーして`.env.local`を作成する

4. `docker-compose build`を実行して、ビルドする

5. `docker-compose up -d`を実行して、docker-compose を立ち上げ

### Next.js

- ブラウザで`http://localhost:3000`を入力して、ログイン画面が開けることを確認する

### Django

- ブラウザで`http://localhost:8000`を入力して、Django 画面が開けることを確認する

### mailpit

- ブラウザで`http://localhost:8025`を入力して、mailpit 画面が開けることを確認する(メール送信はこちらで確認する)

### S3-minio

- ブラウザで`http://localhost:9001`を入力して、S3-minio のログイン画面が開けることを確認する

- 以下のユーザー ID とパスワードでログインできることを確認する

```
ユーザーID:minioadminuser
パスワード:minioadminpassword
```

## VS Code でワークスペースを開く

### Django 側のワークスペース

1. VS Code の左下「><」を押下し、リモートウィンドウを開くオプションを開く

2. 「実行中のコンテナをアタッチ」を選択(Attach to Running Container)

3. `/django_apply`を選択

4. リモートウィンドウが開かれ、フォルダ未選択の場合は/code を開く

### Next.js 側のワークスペース

1. VS Code の左下「><」を押下し、リモートウィンドウを開くオプションを開く

2. 「実行中のコンテナをアタッチ」を選択(Attach to Running Container)

3. `/nextjs_frontend_apply`を選択

4. リモートウィンドウが開かれ、フォルダ未選択の場合は/app を開く

## マイグレーション

- Django 側のワークスペース(/code)で以下を実行

```
python manage.py migrate
```

## 初期ログイン

### クレデンシャル

1. Django 側の`apps/accounts/management/commands/initial_data.py`の`email='test@example.com'`の部分を自身の gmail に変更する

- この後に設定する「Google でログイン」に使用できるため、自身の gmail に変更することを推奨する
- 自身の gamil に変更しない場合でも`test@example.com`を使用してクレデンシャルのログインは可能

2. Django 側のワークスペース(/code)で以下を実行

```
python manage.py initial_data
```

- この実行により、users テーブルおよび departments テーブルに初期値(各々 id=1)が設定される
- 以下の値を入力してログイン可能

```
ユーザーID:自身のgmail(initial_data.pyを変更していない場合はtest@example.com)
パスワード:password
```

### Google でログイン(OAuth2 認証)

1. Google の OAuth2 クライアント ID/シークレットを取得

- Google Cloud Console (https://console.cloud.google.com/)にアクセスし、Googleアカウントでログイン

- 新しいプロジェクトを作成する

- 左側メニュー「API とサービス」→「認証情報」を開く

- 「＋認証情報を作成」→「OAuth クライアント ID」を選択

```
初回は「OAuth同意画面」を設定する必要があります。
ユーザータイプ:
“外部” → 社内や一般ユーザー向け
“内部” → G Suite 組織内限定
必要事項（アプリ名、サポートメール、開発者メールなど）を入力して保存
```

- 「アプリケーションの種類」で「ウェブアプリケーション」を選択

- 承認済みのリダイレクト URI に`http://localhost:3000/api/auth/callback/google`を入力

- Postman を使用して、API テストする場合には`https://oauth.pstmn.io/v1/callback`も設定しておくと良い

- 「作成」ボタン押下。この際、クライアント ID とクライアントシークレットが発行されるので控えておく

2. Django 側のクライアント ID の設定

- Django ディレクトリ内の.env ファイルを作成し、1 で発行されたクライアント ID を設定

```
GOOGLE_CLIENT_ID = "xxxxxxxxxxxx.apps.googleusercontent.com"
```

3. Next.js 側のクライアント ID/シークレットを設定

- `.env.local`で、1 で発行されたクライアント ID/シークレットを設定

```
GOOGLE_ID="xxxxxxxxxxxx.apps.googleusercontent.com"
GOOGLE_SECRET="xxxxxxxxxxxxxxxxxxxxxxxxxx"
```
