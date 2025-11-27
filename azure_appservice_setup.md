# Azure App Service Setup Guide

This guide explains how to create and configure an Azure App Service (Web App) to host your React application.

## 1. Create a Web App

1.  Log in to the [Azure Portal](https://portal.azure.com).
2.  Click **Create a resource** and search for **Web App**.
3.  Click **Create** > **Web App**.
4.  **Project Details**:
    - **Subscription**: Select your subscription.
    - **Resource Group**: Create a new one (e.g., `react-app-rg`) or select an existing one.
5.  **Instance Details**:
    - **Name**: Enter a unique name for your app (this will be part of the URL: `your-app-name.azurewebsites.net`).
    - **Publish**: Select **Code**.
    - **Runtime stack**: Select **Node 18 LTS** (or the version matching your project).
    - **Operating System**: Select **Linux** (recommended for Node.js).
    - **Region**: Select a region close to your users (e.g., `Korea Central`).
6.  **Pricing Plan**:
    - Select a plan. For testing, you can use the **Free F1** tier (if available) or **Basic B1**.
7.  Click **Review + create** and then **Create**.

## 2. Configure Startup Command (Optional but Recommended)

For a React app served as static files or via a simple Node server, Azure usually detects it automatically. However, if you are using a custom server script or need specific startup behavior:

1.  Go to your Web App resource.
2.  In the left menu, under **Settings**, click **Configuration**.
3.  Go to the **General settings** tab.
4.  In **Startup Command**, you can specify the command to start your app (e.g., `pm2 serve /home/site/wwwroot --no-daemon --spa`).
    - *Note: The GitHub Action deploys the `build` folder. Azure App Service on Linux with Node.js uses PM2 by default. If you are just serving static files, you might need a small server script or use PM2 to serve the static folder.*

    **Recommended for React Static Build:**
    Since the GitHub Action deploys the `build` folder content to the root, you might need a simple server to serve `index.html` for all routes (SPA behavior).

    **Option A: Use PM2 to serve static files**
    Startup Command: `pm2 serve /home/site/wwwroot --no-daemon --spa`

## 3. Get Publish Profile

This is required for GitHub Actions to deploy to your app.

1.  Go to the **Overview** page of your Web App.
2.  Click **Get publish profile** in the top toolbar.
3.  Save the file. You will need its content for the GitHub Secret.

## 4. Verify Node Version

1.  Go to **Configuration** > **General settings**.
2.  Ensure **Major version** matches what you selected (Node 18).

## Next Steps

Proceed to the [GitHub Actions Setup](./github_actions_setup.md) guide to configure the deployment pipeline.
