# Notebot - A Notebot Clone <br/> <sub> https://28-notebot-clone.vercel.app/ </sub>

![work in progress](https://i.imgur.com/cW9GVNg.png)

<br/>
<br/>
<br/>

## Project Description

Notebot is a web application designed to replicate the core functionalities of Notion, providing a versatile workspace for notes, documents, and collaboration.

## New Features

*(Add details about recent updates or new functionalities here)*

<br/>
<br/>

## Getting Started

Follow these steps to set up the project locally:

### Step 1: Clone the Repository

```bash
# Choose one of the following methods:
# HTTPS
git clone <repository_https_url>
# SSH
git clone <repository_ssh_url>

cd 28_notion-clone
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

-   **Convex:** Follow the setup guide (refer to timestamp: [https://youtu.be/0OaDyjB9Ib8?t=4679](https://youtu.be/0OaDyjB9Ib8?t=4679))
-   **Clerk:** Follow the setup guide (refer to timestamp: [https://youtu.be/0OaDyjB9Ib8?t=4916](https://youtu.be/0OaDyjB9Ib8?t=4916))
-   **Edge Store:** Follow the setup guide (refer to timestamp: [https://youtu.be/0OaDyjB9Ib8?t=22786](https://youtu.be/0OaDyjB9Ib8?t=22786))

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

Your application should now be running locally.
