package main

import (
    "github.com/labstack/echo/v4"
    "github.com/labstack/echo/v4/middleware"
    "gorm.io/driver/postgres"
    "gorm.io/gorm"
    "net/http"
    "time"
	"fmt"
    // "github.com/golang-jwt/jwt/v4"
	"golang.org/x/crypto/bcrypt"
)

var db *gorm.DB

type User struct {
    ID       uint   `gorm:"primaryKey"`
    Username string `gorm:"unique"`
    Password string
}

type Task struct {
    ID        uint      `gorm:"primaryKey"`
    Title     string
    Completed bool
    UserID    uint
	Status    string    `gorm:"default:'todo'"`
    CreatedAt time.Time
}

func main() {
    e := echo.New()

	// // JWTミドルウェア
    // jwtConfig := middleware.JWTConfig{
    //     SigningKey:  []byte("secret"),
    //     TokenLookup: "header:Authorization",
    //     AuthScheme:  "Bearer",
    // }
    // e.Use(middleware.JWTWithConfig(jwtConfig))

    // CORSミドルウェアの設定
    // e.Use(middleware.CORSWithConfig(middleware.CORSConfig{
    //     AllowOrigins: []string{"http://localhost:3000"}, // フロントエンドのURLを指定
    //     AllowMethods: []string{http.MethodGet, http.MethodPost, http.MethodPut, http.MethodDelete},
    //     AllowHeaders: []string{echo.HeaderContentType},
    // }))

	e.Use(middleware.CORSWithConfig(middleware.CORSConfig{
        AllowOrigins: []string{"http://localhost:3000"}, // 許可するオリジン
        AllowMethods: []string{echo.GET, echo.POST, echo.PUT, echo.PATCH, echo.DELETE},    // 許可するHTTPメソッド
        AllowHeaders: []string{"Content-Type", "Authorization"},               // 許可するヘッダー
    }))

	
    // データベース接続
    var err error
    dsn := "host=database user=postgres password=yourpassword dbname=taskapp port=5432 sslmode=disable"
    db, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
    if err != nil {
        panic("Failed to connect to database")
    }

    // マイグレーション
    db.AutoMigrate(&User{}, &Task{})
	if err := db.AutoMigrate(&User{}, &Task{}); err != nil {
		e.Logger.Fatal(err)
	}

    // ルート設定
	e.POST("/api/v1/auth/register", registerUser)
	e.POST("/api/v1/auth/login", loginUser)
	// e.GET("/api/v1/tasks", getTasks, middleware.JWTWithConfig(jwtConfig))
	e.POST("/api/v1/tasks", createTask)
	e.GET("/api/v1/tasks", getTasks)
	e.PATCH("/api/v1/tasks/:taskId", updateTaskStatus)
	e.DELETE("/api/v1/tasks/:taskId", deleteTask) 

    // サーバ起動
    e.Logger.Fatal(e.Start(":8080"))
}

func hashPassword(password string) (string, error) {
    bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
    return string(bytes), err
}

func registerUser(c echo.Context) error {
    user := new(User)
    if err := c.Bind(user); err != nil {
        return c.JSON(http.StatusBadRequest, map[string]string{"message": "Invalid request"})
    }

    hashedPassword, err := hashPassword(user.Password)
    if err != nil {
        return c.JSON(http.StatusInternalServerError, map[string]string{"message": "Error hashing password"})
    }
    user.Password = hashedPassword

    if err := db.Create(user).Error; err != nil {
        return c.JSON(http.StatusInternalServerError, map[string]string{"message": "Failed to register user"})
    }

    return c.JSON(http.StatusCreated, map[string]string{"message": "User registered successfully"})
}


func loginUser(c echo.Context) error {
    // ログイン処理 (JWTトークン発行)
    return c.JSON(http.StatusOK, map[string]string{"token": "your_jwt_token"})
}

func getTasks(c echo.Context) error {
    var tasks []Task
    if err := db.Find(&tasks).Error; err != nil {
        return c.JSON(http.StatusInternalServerError, map[string]string{"message": "Failed to retrieve tasks"})
    }

    return c.JSON(http.StatusOK, tasks)
}

func createTask(c echo.Context) error {
	fmt.Println("createTask function called")

    task := new(Task)
    if err := c.Bind(task); err != nil {
        return c.JSON(http.StatusBadRequest, map[string]string{"message": "Invalid request"})
    }

	task.Status = "todo"
	// ユーザーIDを仮に 1 として設定（本来はJWTから取得する）
    task.UserID = 1  // 仮のユーザーID

    if err := db.Create(task).Error; err != nil {
		fmt.Println("Failed to create task:", err)
        return c.JSON(http.StatusInternalServerError, map[string]string{"message": "Failed to create task"})
    }

	fmt.Println("Task created successfully:", task) 
    return c.JSON(http.StatusCreated, task)
}

func updateTaskStatus(c echo.Context) error {
    taskID := c.Param("taskId")

    var updatedTask Task
    if err := c.Bind(&updatedTask); err != nil {
        return c.JSON(http.StatusBadRequest, map[string]string{"message": "Invalid request"})
    }

    query := "UPDATE tasks SET status = $1 WHERE id = $2"
    if err := db.Exec(query, updatedTask.Status, taskID).Error; err != nil {
        return c.JSON(http.StatusInternalServerError, map[string]string{"message": "Failed to update task status"})
    }

    return c.JSON(http.StatusOK, map[string]string{"message": "Task status updated successfully"})
}

func deleteTask(c echo.Context) error {
    taskID := c.Param("taskId")

    if err := db.Delete(&Task{}, taskID).Error; err != nil {
        return c.JSON(http.StatusInternalServerError, map[string]string{"message": "Failed to delete task"})
    }

    return c.JSON(http.StatusOK, map[string]string{"message": "Task deleted successfully"})
}

