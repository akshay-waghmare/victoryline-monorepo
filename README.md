# VictoryLine - Live Cricket Score Application

A comprehensive live cricket score application built with a modern tech stack, combining real-time data scraping, secure backend APIs, and an interactive frontend.

## 🏗️ Architecture

This monorepo contains three main applications that work together:

```
victoryline-monorepo/
├── apps/
│   ├── frontend/     # Angular-based web application
│   ├── backend/      # Spring Boot REST API with JWT authentication
│   └── scraper/      # Python-based cricket data scraper
└── packages/         # Shared utilities (future)
```

### Components

#### 🎨 Frontend (`apps/frontend`)
- **Tech Stack**: Angular, TypeScript, Bootstrap
- **Branch**: `adv` (production-ready)
- **Features**:
  - Real-time cricket score updates
  - User authentication & authorization
  - Responsive design for mobile/desktop
  - Match details and player statistics

#### 🔐 Backend (`apps/backend`)
- **Tech Stack**: Spring Boot, Java, JWT, MySQL
- **Branch**: `production`
- **Features**:
  - RESTful API endpoints
  - JWT-based authentication
  - Role-based access control (RBAC)
  - Match and user data management
  - Secure API for frontend consumption

#### 🕷️ Scraper (`apps/scraper`)
- **Tech Stack**: Python, Crawlee, Scrapy
- **Branch**: `production`
- **Features**:
  - Real-time cricket match data scraping
  - Ball-by-ball data collection
  - Player statistics aggregation
  - Data processing and storage
  - API service for scraped data

## 🚀 Getting Started

### Prerequisites

- **Node.js** >= 14.0.0
- **pnpm** >= 8.0.0 (recommended) or npm
- **Python** >= 3.8
- **Java** >= 11
- **Maven** >= 3.6
- **MySQL** >= 5.7 (for backend)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/akshay-waghmare/victoryline-monorepo.git
cd victoryline-monorepo
```

2. **Install all dependencies**
```bash
npm run install:all
```

Or install individually:

```bash
# Frontend dependencies
cd apps/frontend
npm install

# Backend dependencies
cd apps/backend
mvn clean install

# Scraper dependencies
cd apps/scraper
pip install -r requirements.txt
```

### Development

Run each service in separate terminals:

```bash
# Terminal 1 - Frontend (runs on http://localhost:4200)
npm run dev:frontend

# Terminal 2 - Backend (runs on http://localhost:8080)
npm run dev:backend

# Terminal 3 - Scraper (runs on http://localhost:5000)
npm run dev:scraper
```

### Build

Build all applications for production:

```bash
npm run build:all
```

Or build individually:

```bash
npm run frontend:build
npm run backend:build
```

### Testing

Run all tests:

```bash
npm run test:all
```

Or test individually:

```bash
npm run frontend:test
npm run backend:test
npm run scraper:test
```

## 📦 Project Structure

### Frontend Structure
```
apps/frontend/
├── src/
│   ├── app/          # Angular components, services, guards
│   ├── assets/       # Static assets
│   └── environments/ # Environment configurations
├── angular.json
└── package.json
```

### Backend Structure
```
apps/backend/
├── src/
│   └── main/
│       ├── java/     # Spring Boot application code
│       └── resources/# Configuration files
├── pom.xml
└── Dockerfile
```

### Scraper Structure
```
apps/scraper/
├── src/              # Python scraper modules
├── tests/            # Test files
├── requirements.txt
└── run_server.py     # API server
```

## 🔧 Configuration

### Frontend Configuration
- Update `apps/frontend/src/environments/environment.ts` with your API URLs

### Backend Configuration
- Update `apps/backend/src/main/resources/application.properties` with database credentials

### Scraper Configuration
- Update scraper configuration in `apps/scraper/src/config.py`

## 🐳 Docker Support

Each application includes Dockerfile for containerization:

```bash
# Build and run with Docker Compose
docker-compose up --build
```

## 🌿 Branch Strategy

- **Frontend**: `adv` branch contains latest stable code
- **Backend**: `production` branch contains latest stable code
- **Scraper**: `production` branch contains latest stable code

## 📝 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev:frontend` | Start frontend development server |
| `npm run dev:backend` | Start backend development server |
| `npm run dev:scraper` | Start scraper API server |
| `npm run build:all` | Build all applications |
| `npm run test:all` | Run all tests |
| `npm run install:all` | Install all dependencies |

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the ISC License.

## 👨‍💻 Author

**Akshay Waghmare**

## 🔗 Original Repositories

This monorepo combines code from:
- [crex_scraper_python](https://github.com/akshay-waghmare/crex_scraper_python)
- [jwt-example-role-based](https://github.com/akshay-waghmare/jwt-example-role-based)
- [laundry-app](https://github.com/akshay-waghmare/laundry-app)

## 📞 Support

For issues and questions, please open an issue in the GitHub repository.

---

**Note**: Make sure to configure environment variables and database connections before running the applications.
