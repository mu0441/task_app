package main

import (
	"fmt"
	"net/http"
	"os"
	"time"
	"strconv"

	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"

	"golang.org/x/crypto/bcrypt"
	"github.com/golang-jwt/jwt/v5"
)

var db *gorm.DB
var jwtSecret []byte

type User struct {
	ID       uint   `gorm:"primaryKey"`
	Username string `gorm:"uniqueIndex"`
	Password string
	CreatedAt time.Time
}

type Task struct {
	ID        uint      `gorm:"primaryKey"`
	Title     string
	Completed bool
	Status    string    `gorm:"default:'todo'"`
	UserID    uint      `gorm:"index"`
	CreatedAt time.Time
}

// JWTのクレーム
type Claims struct {
	UserID uint `json:"uid"`
	jwt.RegisteredClaims
}

func main() {
	jwtSecret = []byte(os.Getenv("JWT_SECRET"))
	dsn := fmt.Sprintf(
		"host=%s user=%s password=%s dbname=%s port=%s sslmode=%s",
		getenv("DB_HOST", "database"),
		getenv("DB_USER", "postgres"),
		getenv("DB_PASSWORD", "yourpassword"),
		getenv("DB_NAME", "taskapp"),
		getenv("DB_PORT", "5432"),
		getenv("DB_SSLMODE", "require"),
	)

	var err error
	db, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		panic("Failed to connect to database")
	}
	if err := db.AutoMigrate(&User{}, &Task{}); err != nil {
		panic(err)
	}

	corsOrigin := getenv("CORS_ORIGIN", "http://localhost:3000")
	e := echo.New()
	e.Use(middleware.CORSWithConfig(middleware.CORSConfig{
		AllowOrigins: []string{corsOrigin},
		AllowMethods: []string{http.MethodGet, http.MethodPost, http.MethodPut, http.MethodPatch, http.MethodDelete},
		AllowHeaders: []string{"Content-Type", "Authorization"},
	}))

	// 認証不要
	e.GET("/health", func(c echo.Context) error {
		return c.String(http.StatusOK, "ok")
	})
	e.POST("/api/v1/auth/register", registerUser)
	e.POST("/api/v1/auth/login", loginUser)

	// 認証必須
	r := e.Group("/api/v1")
	r.Use(jwtMiddleware())

	r.GET("/tasks", getTasksMe)
	r.POST("/tasks", createTask)
	r.PATCH("/tasks/:taskId", updateTask)
	r.DELETE("/tasks/:taskId", deleteTask)

	e.Logger.Fatal(e.Start(":8080"))
}

func getenv(k, def string) string {
	if v := os.Getenv(k); v != "" { return v }
	return def
}

func hashPassword(pw string) (string, error) {
	b, err := bcrypt.GenerateFromPassword([]byte(pw), bcrypt.DefaultCost)
	return string(b), err
}
func checkPassword(hash, pw string) error {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(pw))
}

func registerUser(c echo.Context) error {
	u := new(User)
	if err := c.Bind(u); err != nil || u.Username == "" || u.Password == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"message": "Invalid request"})
	}
	h, err := hashPassword(u.Password)
	if err != nil { return c.JSON(http.StatusInternalServerError, map[string]string{"message": "Hash error"}) }
	u.Password = h
	if err := db.Create(u).Error; err != nil {
		return c.JSON(http.StatusConflict, map[string]string{"message": "Username already exists"})
	}
	return c.JSON(http.StatusCreated, map[string]any{"message":"User registered","userId":u.ID})
}

func loginUser(c echo.Context) error {
	var in struct{ Username, Password string }
	if err := c.Bind(&in); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"message": "Invalid request"})
	}
	var u User
	if err := db.Where("username = ?", in.Username).First(&u).Error; err != nil {
		return c.JSON(http.StatusUnauthorized, map[string]string{"message": "Invalid credentials"})
	}
	if err := checkPassword(u.Password, in.Password); err != nil {
		return c.JSON(http.StatusUnauthorized, map[string]string{"message": "Invalid credentials"})
	}
	// JWT発行（1日有効）
	claims := &Claims{
		UserID: u.ID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	ss, err := token.SignedString(jwtSecret)
	if err != nil { return c.JSON(http.StatusInternalServerError, map[string]string{"message": "Token error"}) }
	return c.JSON(http.StatusOK, map[string]string{"token": ss})
}

// 認証ミドルウェア
func jwtMiddleware() echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			auth := c.Request().Header.Get("Authorization")
			const prefix = "Bearer "
			if len(auth) <= len(prefix) || auth[:len(prefix)] != prefix {
				return c.JSON(http.StatusUnauthorized, map[string]string{"message":"Missing token"})
			}
			tokStr := auth[len(prefix):]
			token, err := jwt.ParseWithClaims(tokStr, &Claims{}, func(t *jwt.Token) (interface{}, error) {
				return jwtSecret, nil
			})
			if err != nil || !token.Valid {
				return c.JSON(http.StatusUnauthorized, map[string]string{"message":"Invalid token"})
			}
			claims := token.Claims.(*Claims)
			// コンテキストにユーザーIDを格納
			c.Set("uid", claims.UserID)
			return next(c)
		}
	}
}

// ログインユーザーのタスク
func getTasksMe(c echo.Context) error {
	uid := c.Get("uid").(uint)
	var tasks []Task
	if err := db.Where("user_id = ?", uid).Order("id asc").Find(&tasks).Error; err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"message": "Failed to retrieve tasks"})
	}
	return c.JSON(http.StatusOK, tasks)
}

func createTask(c echo.Context) error {
	uid := c.Get("uid").(uint)
	task := new(Task)
	if err := c.Bind(task); err != nil || task.Title == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"message": "Invalid request"})
	}
	task.UserID = uid
	if task.Status == "" { task.Status = "todo" }
	if err := db.Create(task).Error; err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"message": "Failed to create task"})
	}
	return c.JSON(http.StatusCreated, task)
}

// タイトル/ステータス編集に両対応
func updateTask(c echo.Context) error {
	uid := c.Get("uid").(uint)
	idStr := c.Param("taskId")
	id, _ := strconv.Atoi(idStr)

	var body struct {
		Title  *string `json:"title"`
		Status *string `json:"status"`
		Completed *bool `json:"completed"`
	}
	if err := c.Bind(&body); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"message": "Invalid request"})
	}

	var t Task
	if err := db.Where("id = ? AND user_id = ?", id, uid).First(&t).Error; err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{"message": "Task not found"})
	}

	updates := map[string]any{}
	if body.Title != nil { updates["title"] = *body.Title }
	if body.Status != nil { updates["status"] = *body.Status }
	if body.Completed != nil { updates["completed"] = *body.Completed }

	if len(updates) == 0 {
		return c.JSON(http.StatusBadRequest, map[string]string{"message": "No fields to update"})
	}
	if err := db.Model(&t).Updates(updates).Error; err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"message": "Failed to update task"})
	}
	return c.JSON(http.StatusOK, t)
}

func deleteTask(c echo.Context) error {
	uid := c.Get("uid").(uint)
	idStr := c.Param("taskId")
	id, _ := strconv.Atoi(idStr)
	if err := db.Where("id = ? AND user_id = ?", id, uid).Delete(&Task{}).Error; err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"message": "Failed to delete task"})
	}
	return c.JSON(http.StatusOK, map[string]string{"message": "Task deleted"})
}
