import app from './app';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
  console.log(`📚 API Documentation available at http://localhost:${port}/api/docs`);
});
