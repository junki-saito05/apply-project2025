FROM node:18-alpine

# 作業ディレクトリを設定
WORKDIR /app

# 依存ファイルを先にコピーしてインストール
COPY package.json package-lock.json* yarn.lock* ./
RUN npm install

# アプリ本体をコピー
COPY . .

# Next.jsのビルド（本番用の場合）
# RUN npm run build

EXPOSE 3000

# 開発用コマンド
CMD ["npm", "run", "dev"]
