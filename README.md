# Social Media Analytics Platform - Backend

This is the **backend service** for the Social Media Analytics Platform.  
It is built with **Node.js**, **TypeScript**, **Express**, and **MongoDB**, providing APIs for authentication, posts management, analytics, and scheduled jobs.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Scripts](#scripts)
- [API Endpoints](#api-endpoints)
- [Folder Structure](#folder-structure)
- [License](#license)

---

## Features

- User authentication using JWT with refresh tokens stored in cookies
- CRUD operations for posts and user management
- Analytics endpoints for post performance
- Scheduled jobs using `node-cron` (e.g., publish posts automatically)
- Input validation using `zod` and `express-validator`
- Security hardening with `helmet` and `express-mongo-sanitize`
- CORS support for frontend integration

---

## Tech Stack

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **TypeScript** - Type-safe JavaScript
- **MongoDB** - Database
- **Mongoose** - ODM for MongoDB
- **JWT** - Authentication
- **Node-cron** - Scheduled tasks
- **Zod** - Input validation
- **Helmet** - Security headers
- **Express-mongo-sanitize** - Prevent NoSQL injection
- **Cookie-parser** - Parse cookies

---

## Prerequisites

- Node.js >= 20
- npm >= 9
- MongoDB (local or cloud, e.g., MongoDB Atlas)

---

## Getting Started

### 1. Clone the repository

```bash
git clone <https://github.com/saqlain-abbas01/Social-Media-Analytic-Platform-Backend>
cd backend
Install dependencies
npm install
