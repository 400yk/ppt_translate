# PPT Translate

PPT Translate is a web application designed to seamlessly translate PowerPoint presentations (PPT/PPTX files) between Chinese and English. Leveraging cutting-edge AI technology, the platform enables users to effortlessly convert their presentations from one language to another, maintaining the structure and formatting of the original slides.

Users can easily upload their PPT/PPTX files directly to PPT Translate, and the AI engine will process the content, translating all text within the slides. Once the translation is complete, users can download the newly translated presentation in PPT/PPTX format.

The website features a clean and intuitive user interface, with a primary light blue color scheme complemented by teal accents, creating a modern and professional aesthetic.

## Project Goals

- **Accurate Translation**: Provide high-quality, contextually accurate translations of PPT/PPTX files between Chinese and English.
- **Preserve Formatting**: Maintain the original formatting, layout, and structure of the slides throughout the translation process.
- **User-Friendly Interface**: Design an intuitive and easy-to-use interface for uploading, processing, and downloading presentations.
- **Efficient Processing**: Offer fast and efficient AI-powered translation processing for a smooth user experience.
- **Visually Appealing Design**: Create a visually appealing website design using a light blue primary color and teal accent color.
- **Support PPT/PPTX**: Focus on handling PPT/PPTX presentation files.

## Getting Started

### Prerequisites
- Docker and Docker Compose
- OpenAI API key (for translations)

### Installation
Clone the repository:

```bash
git clone https://github.com/your-username/ppt_translate.git
cd ppt_translate
```

Configure environment variables:

```bash
cp backend/.env.example backend/.env
```
Then edit the `backend/.env` file to add your API keys and customize settings.

Start the application using Docker Compose:

```bash
docker-compose up
```

Open your browser and navigate to [http://localhost:5173](http://localhost:5173)

### Environment Variables
The project uses environment variables for configuration. Copy `backend/.env.example` to `backend/.env` and customize with your settings:

- **API Settings**: Configure the API port and debug mode
- **Storage Settings**: Configure MinIO, S3, or Azure storage
- **Celery Settings**: Redis connection for task queue
- **Translation Settings**: Add your OpenAI or DeepL API keys
- **CORS Settings**: Configure allowed frontend origins

**Never commit your .env file containing sensitive API keys to version control!**

### Development Setup
If you want to develop locally without Docker:

#### Frontend
Navigate to the frontend directory:

```bash
cd src/app
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

#### Backend
Navigate to the backend directory:

```bash
cd backend
```

Create a virtual environment:

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Start MinIO and Redis (required for storage and job queue):

```bash
docker-compose up redis minio
```

Start the FastAPI server:

```bash
uvicorn app:app --reload
```

Start the Celery worker:

```bash
celery -A worker.celery_app worker --loglevel=info
```

## Usage
1. Visit the PPT Translate website in your browser
2. Upload your PowerPoint presentation (PPT/PPTX file)
3. Wait for the translation process to complete
4. Download your translated presentation

## Technologies Used
- **Frontend**: React, TypeScript, Tailwind CSS
- **Backend**: FastAPI, Celery, Python-PPTX
- **Storage**: MinIO (S3-compatible)
- **Translation**: OpenAI GPT-4o / DeepL API
- **Database**: Redis (for job queue)
- **Containerization**: Docker, Docker Compose

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

