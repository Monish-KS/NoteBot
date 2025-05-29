# NoteBot

## Project Overview

NoteBot is an efficient, intuitive, and feature-rich solution for note-taking and document management. It addresses the need for a unified platform that integrates essential functionalities such as flashcard creation, AI assistance, and public document sharing, which are often lacking in existing tools. NoteBot aims to streamline workflows and boost productivity by offering a comprehensive solution for organizing, searching, and retrieving notes, even with large volumes of information.

## Key Features

NoteBot combines document management, study tools, public sharing, and modern UI/UX practices. It integrates the following key features:

*   **Document CRUD Operations:** Create, read, update, and delete documents using a rich text or markdown editor.
*   **Document Organization:** Efficiently manage and retrieve notes using folders, tags, and trash functionalities.
*   **Flashcard Creation:** Users can generate and organize flashcards for study purposes.
*   **AI-powered Support:** Integrated artificial intelligence capabilities to enhance user experience.
*   **Public Document Previews:** Generate unique, shareable links for public previewing of selected documents.
*   **Secure User Authentication:** Secure signup and login mechanisms for data access and personalization.
*   **Theming and Responsive UI:** Customizable themes and a user interface that adapts seamlessly across various devices.

## Requirements

### Functional Requirements

*   **Document CRUD Operations:** Users can create, read, update, and delete documents.
*   **Document Organization:** Support for folders, tags, and trash for efficient note management.
*   **Flashcard Creation:** Ability to generate and organize flashcards.
*   **Public Document Preview:** Feature to generate shareable links for public viewing of documents.
*   **User Authentication:** Secure user signup and login.

### Non-Functional Requirements

*   **Responsive UI:** Consistent user experience across all devices.
*   **Fast Load Times:** Optimized performance for quick loading.
*   **Secure Data Storage:** Implementation of modern authentication and encryption protocols.
*   **Scalability:** Ability to handle increasing users and data without performance degradation.

## Tech Stack

*   **Frontend:** React, Next.js, ShadCN UI
*   **Backend:** Node.js, Express.js
*   **Authentication:** Appwrite Authentication
*   **Database:** MongoDB / Cloud NoSQL
*   **AI Integration (optional):** OpenAI API / Langchain
*   **Deployment:** Vercel (Frontend), Heroku or AWS (Backend)
*   **Monitoring:** Sentry (Error and performance monitoring)
*   **Task Management:** Jira
*   **Version Control:** Git + GitHub

## Getting Started

Follow these steps to set up the NoteBot project locally:

### Step 1: Clone the Repository

```bash
# Choose one of the following methods:
# HTTPS
git clone <repository_https_url>
# SSH
git clone <repository_ssh_url>

```

### Step 2: Install Dependencies

```bash
pnpm i
```

### Step 3: Set Up Environment Variables

Create a `.env.local` file in the root directory by copying the example file:

```bash
cp .env.example .env.local
```

Update the `.env.local` file with your credentials for the following services:

*   **Convex:** Configure your Convex project and obtain the necessary environment variables.
*   **Clerk:** Set up Clerk for user authentication and retrieve your API keys.
*   **Edge Store:** Configure Edge Store for file storage and obtain your credentials.

### Step 4: Run the Development Servers

Open two separate terminals:

**Terminal 1:**

```bash
pnpm dev
```

**Terminal 2:**

```bash
pnpx convex dev
```

Your NoteBot application should now be running locally.
