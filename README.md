# apply-project2025

## 環境構築手順

- Docker 環境での立ち上げを前提とする

1. develop ブランチからローカルにクローンする

2. .env.example をコピーして.env ファイルを作成する

3. `docker-compose build`を実行して、ビルドする

4. `docker-compose up -d`を実行して、docker-compose を立ち上げ

### Django

- ブラウザで`http://localhost:8000`を入力して、Django 画面が開けることを確認する

### Next.js

- ブラウザで`http://localhost:3000`を入力して、Next.js 画面が開けることを確認する

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

### Django側のワークスペース

1. VS Code の左下「><」を押下し、リモートウィンドウを開くオプションを開く

2. 「実行中のコンテナをアタッチ」を選択(Attach to Running Container)

3. リモートウィンドウが開かれ、フォルダ未選択の場合は/code を開く

### Next.js側のワークスペース

1. VS Code の左下「><」を押下し、リモートウィンドウを開くオプションを開く

2. 「実行中のコンテナをアタッチ」を選択(Attach to Running Container)

3. リモートウィンドウが開かれ、フォルダ未選択の場合は/app を開く
