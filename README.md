# 🚀 Personal Resume/Blog

This project is built using **[Astro 5.0](https://astro.build/) + [Tailwind CSS](https://tailwindcss.com/)**, leveraging the **AstroWind** template for performance, responsiveness, and ease of use.

🔗 **AstroWind Source**: [onwidget/astrowind](https://github.com/onwidget/astrowind)

---

## 🌟 Features

✅ **Fast & Optimized**: Performance-focused with **SEO-friendly** practices.  
✅ **Tailwind CSS**: Custom styling made simple with **dark mode** support.  
✅ **Dynamic Pages**: Automatically generates pages from `.astro` and `.md` files.  
✅ **Customizable Goals Page**: Easily modify milestones & goals via `goals.yaml`.  
✅ **Blog System**: Write posts in Markdown with built-in RSS feed & categories.  
✅ **Deploy Anywhere**: Deployed to **AWS S3**.

## 📌 Getting Started

1.  **Clone the repository**
2.  **Install dependencies**

    `npm install`

3.  **Start local development**

    `npm run dev`

4.  **Build for production**

    `npm run build`

5.  **Preview the build**

    `npm run preview`

## 📝 Customization Guide

### 🎯 **Modifying Activity Page**

The **Goals & Milestones** section is dynamically loaded from `goals.yaml` located in root.

📂 **Modify goals in `src/data/goals.yaml`**:

```goals:
  - project: "DevOps Certification"
    milestones:
      - name: "Terraform Exam"
        date: "March 2025"
        completed: false
        current: true
        steps:
          - name: "Learn Terraform"
            completed: true
          - name: "Practice & Mock Exams"
            completed: false
            current: true
```

🔹 **Steps Icons**:

- ✅ `✔` (Completed)
- 🚧 `🚧` (In Progress)
- ⏳ `⏳` (Planned)

**Github public projects** in the activity are populated through github api.
`src/pages/activity.astro` expects .env in root with your github username and access token.

**.env.example** has been provided.

```
# Copy the contents of this file to a .env file

# Github api
GITHUB_TOKEN=add_your_github_token

GITHUB_USERNAME=your_github_username
```

### ✍ **Updating Signature**

Upload your **signature** in:
`src/assets/signature.jpg`

Replace this file to change the signature displayed on the site or replace it
with any logo logo in : `src/components/Logo.astro`

### 📄 **Managing Pages**

Astro **automatically generates** pages from `.astro` files inside: `src/pages/`

- `/index.astro` → Homepage
- `/about.astro` → About page
- `/contact.astro` → Contact form

✏️ **To create a new page**, simply add:

```
title: "New Page"
description: "This is a new page."
---

<h1>Welcome to the New Page!</h1>

```

Your new page will be available at **`/new-page`**.

**Navbar navigation** :

Simply open **`/src/navigation.ts`** and add or remove destinations as shown in the code below :

```
export const headerData = {
  links: [
    {
      text: 'Home',
      href: getPermalink('/'),
    },
    {
      text: 'Personal',
      href: getPermalink('/personal'),
    },
    {
      text: 'CV',
      href: getPermalink('/cv'),
    },
    {
      text: 'Goals & Activity',
      href: getPermalink('/activity'),
    },
    {
      text: 'Blog',
      href: getPermalink('/blog'),
    },
    {
      text: 'Contact',
      href: getPermalink('/contact'),
    },
  ]
};

```

### 📰 **Writing Blog Posts**

Blog posts are stored in: `src/data/post/`

Write posts in Markdown (`.md`) or MDX (`.mdx`):

```
---
title: "My First Blog Post"
date: "2024-02-28"
tags: ["astro", "devops"]
description: "A short summary of this post."
---

## Hello, World!
This is my first blog post using Astro 🚀.

```

📌 **Blog Features**:

- Auto-generates RSS feed
- Supports **Categories & Tags**
- Uses **Markdown & MDX** for easy writing

## 🔗 Credits & License

Built using **[AstroWind](https://github.com/onwidget/astrowind)** – a **highly optimized** Astro + Tailwind template.

📜 **MIT License** – Free to use & modify.
