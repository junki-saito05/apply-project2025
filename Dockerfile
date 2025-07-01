FROM python:3.10

# WSLのUIDとGIDを環境変数として渡す
ARG PUID=1000
ARG PGID=1000

# 必要なパッケージのインストール
RUN apt-get update && apt-get install -y \
  git \
  curl \
  libmariadb-dev \
  libjpeg-dev \
  libfreetype6-dev \
  tzdata \
  && ln -fs /usr/share/zoneinfo/Asia/Tokyo /etc/localtime \
  && echo "Asia/Tokyo" > /etc/timezone \
  && dpkg-reconfigure -f noninteractive tzdata

# ユーザーとグループを作成し、UIDとGIDを設定
RUN groupadd -g ${PGID} django && \
  useradd -u ${PUID} -g ${PGID} -m django

# debugpyをインストール
RUN pip install --no-cache-dir debugpy

# 作業ディレクトリの設定
WORKDIR /code

# requirements.txtを先にコピーして依存解決
COPY ./requirements.txt /code/

# Pythonパッケージのインストール
RUN pip install --upgrade pip && pip install -r requirements.txt

# プロジェクトのコードをコピー
COPY . /code/

# 権限の設定
RUN chown -R django:django /code

USER django

# デフォルトコマンド（runserver）
CMD ["python", "-m", "debugpy", "--listen", "0.0.0.0:5678", "manage.py", "runserver", "0.0.0.0:8000"]
