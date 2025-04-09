# ビルド用のステージ
FROM node:20-alpine AS builder
WORKDIR /app

# 依存パッケージのインストール
COPY package*.json ./
RUN npm install

# アプリケーションのコードをすべてコピー
COPY . .

# Next.jsビルド
RUN npm run build

# 実行環境用
FROM node:20-alpine
WORKDIR /app

# standalone の実行ファイルをコピー
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

# Next.jsアプリの起動
CMD ["node", "server.js"]
