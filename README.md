# 💬 Chat App using WebSockets

A lightweight real-time group chat application built with WebSockets.
It’s a simple MVP that lets users join rooms and chat instantly, with a clean interface and smooth experience.

## ✨ Features

* **Real-time messaging** – Instant chat powered by WebSockets.
* **Group rooms** – Create or join chat rooms to talk with others.
* **Typing indicators** – See when someone is typing.
* **Seen status** – Know when your message has been viewed.
* **Clean design** – Modern UI built with Shadcn UI and Tailwind CSS.


## 🚀 Technology Stack

This application is a monorepo managed by **Turborepo**, comprising a Next.js frontend and a Node.js backend.

### Frontend (`apps/web`)

-   **Framework:** [Next.js](https://nextjs.org/) (React framework for production)
-   **Styling:** [Tailwind CSS](https://tailwindcss.com/) (utility-first CSS framework)
-   **UI Components:** [Shadcn UI](https://ui.shadcn.com/) (beautifully designed components built with Radix UI and Tailwind CSS)
-   **Notifications:** [Sonner](https://sonner.emilkowalski.app/) (an opinionated toast component for React)
-   **Language:** [TypeScript](https://www.typescriptlang.org/)
-   **WebSocket Client:** Native WebSocket API

### Backend (`apps/server`)

-   **Runtime:** [Node.js](https://nodejs.org/)
-   **Web Framework:** [Express.js](https://expressjs.com/) (for HTTP health checks)
-   **WebSockets:** [`ws` library](https://github.com/websockets/ws) (for WebSocket server implementation)
-   **Scheduling:** [`node-cron`](https://github.com/node-cron/node-cron) (for server-side tasks like room cleanup)
-   **Language:** [TypeScript](https://www.typescriptlang.org/)

## 🛠️ Setup & Running Locally

### Prerequisites

Before you begin, ensure you have the following installed:

-   [Node.js](https://nodejs.org/en/download/) (v18 or higher)
-   [Yarn](https://classic.yarnpkg.com/en/docs/install/) (recommended package manager for this monorepo)
-   [Docker](https://www.docker.com/products/docker-desktop/) & [Docker Compose](https://docs.docker.com/compose/install/) (for containerized setup)

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/chat-app.git
cd chat-app
```

### 2. Install Dependencies

Install dependencies for the entire monorepo:

```bash
yarn install
```

### 3. Run with Docker Compose (Recommended)

For the easiest setup, use Docker Compose to run both the frontend and backend services:

```bash
docker-compose up --build
```

-   The frontend will be accessible at `http://localhost:3000`.
-   The backend API will be running on `http://localhost:4000`.

### 4. Run Manually (Alternative)

If you prefer to run the services individually without Docker:

#### Start the Backend Server

```bash
cd apps/server
yarn dev
# Or, if you need to build first:
yarn build
node dist/index.js
```

The backend server will start on `http://localhost:4000`.

#### Start the Frontend Application

```bash
cd apps/web
yarn dev
```

The frontend application will start on `http://localhost:3000`.

## 📂 Project Structure

-   `apps/server`: Contains the Node.js WebSocket backend.
-   `apps/web`: Contains the Next.js frontend application.
