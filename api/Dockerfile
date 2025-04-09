FROM golang:1.23 AS builder
WORKDIR /app

# 依存関係のインストール
COPY go.mod go.sum ./
RUN go mod tidy
RUN go mod vendor

# Air (ホットリロードツール) のインストール
RUN go install github.com/air-verse/air@latest

# vendorディレクトリをコピー
COPY vendor/ vendor/
ENV GOFLAGS="-mod=vendor"

# アプリケーションコードのコピー
COPY . .

# ビルド
RUN go build -o main .
# 実行環境の設定
FROM golang:1.23
WORKDIR /app
COPY --from=builder /app/main .
COPY --from=builder /go/bin/air /go/bin/air
EXPOSE 8080
CMD ["air"]
