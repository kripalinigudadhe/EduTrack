
# 📘 EduTrack – Student Guide Assistant

EduTrack is a **student guide assistant** built using **HTML, CSS, JavaScript, Node.js, and Groq API**.
It is designed to help students manage academic tasks, get guidance, and stay organized through an interactive assistant interface.

 🚀 Features
* ✅ Interactive student guide powered by **Groq API**
* ✅ Task and schedule management for students
* ✅ User-friendly **frontend (HTML, CSS, JS)**
* ✅ **Backend with Node.js & Express**
* ✅ Secure configuration with **.env file**
* ✅ Database integration for persistence

 🛠️ Tech Stack
* **Frontend:** HTML, CSS, JavaScript
* **Backend:** Node.js, Express
* **Database:** (Your DB name here – e.g., MongoDB / MySQL / PostgreSQL)
* **API Integration:** Groq API
* **Environment Variables:** Managed using `.env` file

## 📂 Installation & Setup
1. **Clone the repository**

   ```bash
   git clone https://github.com/your-username/EduTrack.git
   cd EduTrack
   ```
2. **Install dependencies**

   ```bash
   npm install
   ```
3. **Set up environment variables**
   Create a `.env` file in the root directory and add:

   ```env
   GROQ_API_KEY=your_groq_api_key_here
   DATABASE_PASSWORD=your_database_password_here
   ```
4. **Run the project**

   ```bash
   node server.js
   ```
   (Or use `nodemon` if installed: `npm run dev`)

5. Open your browser at:

   ```
   http://localhost:3000
   ```

📌 Project Structure
```
EduTrack/
│-- public/         # Static files (CSS, JS, images)
│-- views/          # HTML/EJS templates
│-- routes/         # Express routes
│-- models/         # Database models
│-- server.js       # Main entry point
│-- package.json    # Project metadata & dependencies
│-- .env            # Environment variables
```

 🔑 Environment Variables
* `GROQ_API_KEY` → Your Groq API key
* `DATABASE_PASSWORD` → Password for your database connection

📄 License
This project is licensed under the **Kripalini Gudadhe**.

