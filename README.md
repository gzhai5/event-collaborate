# 📘 Event Collaborate Backend

A NestJS + TypeORM backend for managing user events, merging overlapping events, and generating AI-powered summaries.  
This project includes:

- User + Event CRUD  
- Efficient **batch event creation** (500+ events under 2s)  
- Automatic event **merge detection**  
- AI-generated summaries using **LangChain + OpenAI**  
- Background job worker via **BullMQ**  
- Audit logging for merge operations  

---

# 🚀 Getting Started

## 1. Clone the repo

```bash
git clone <repo-url>
cd event-collaborate/backend
```

## 2. Install dependencies
```bash
npm install
```

## 3. Set up environment variables
Create a .env file:
```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=myuser
DB_PASS=mypassword
DB_NAME=mydb

OPENAI_API_KEY=yours
```

## 4. Run PostgreSQL
```bash
cd docker
docker compose up --build
```

## 5. Start the backend API Server
```bash
cd backend
npm run start:dev
```

The server runs at: http://localhost:3000.

Swagger UI: http://localhost:3000/api

# 🧪 Running Tests
```bash
npm run test
```

# 🤖 AI Tools Used
AI is mostly used for learning some basic set up/how to write test code on Nest.JS server and Debugging the code in Part 3&4 for improving the coding speed to finish the project. AI is also used to polish the styling for the readme file.

# 🔁 Reasoning About the Merge Algorithm
1. Fetch all user events

2. Sort by startTime

3. Maintain a sliding “current merge window” (prev)

4. For each event:

5. Check if Overlap? (prev.end >= current.start)

6. Extend prev.end

7. Append current.id to prev.mergedFrom

8. Merge titles & preserve status

9. No overlap: push prev

10. Push last prev since it is still unhandled

11. Save merged results + audit logs

