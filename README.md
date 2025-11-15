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
The merge process retrieves all events for a user, sorts them by startTime, and then scans through them chronologically. A sliding window (prev) is used to track the currently active event block. For each next event, the system checks whether it overlaps with the current window (prev.endTime >= current.startTime). If they overlap, the events are merged by extending the end time to the latest end, combining titles, updating status, and appending the source event IDs into mergedFrom. An audit log entry is created for every merge operation.

If the next event does not overlap, the system concludes the current window and pushes prev into the merged result list, then shifts the window to the new event. After the loop finishes, the final prev window is also added to the results.

For any merged event produced from multiple originals, an AI summary is generated using the titles/IDs of the source events. Finally, the merged events replace the user’s event list in the database, and all audit logs are persisted. This results in a clean, non-overlapping timeline while fully preserving merge history.

