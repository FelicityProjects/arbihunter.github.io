# GitHub Actions Setup for Azure Deployment

This guide explains how to set up GitHub Actions to automatically deploy your React application to Azure App Service.

## Prerequisites

- An Azure account with an active subscription.
- A GitHub repository containing your application code.
- An Azure App Service (Web App) created (see [Azure App Service Setup](./azure_appservice_setup.md)).

## Workflow File

The workflow file is located at `.github/workflows/azure-webapps-node.yml`. It contains the configuration for building and deploying your application.

### Key Components

- **Trigger**: The workflow is triggered on push to the `main` branch.
  ```yaml
  on:
    push:
      branches:
        - main
  ```

- **Environment Variables**:
  - `AZURE_WEBAPP_NAME`: The name of your Azure Web App. **You must update this in the file.**
  - `NODE_VERSION`: The Node.js version to use (currently set to '18.x').

- **Jobs**:
  - **build**: Installs dependencies, builds the React app, and uploads the `build` folder as an artifact.
  - **deploy**: Downloads the artifact and deploys it to Azure Web App using the Publish Profile.

## Configuration Steps

1.  **Update Workflow File**:
    - Open `.github/workflows/azure-webapps-node.yml`.
    - Change the `AZURE_WEBAPP_NAME` value to match your actual Azure Web App name.

2.  **Get Publish Profile**:
    - Go to your Web App in the [Azure Portal](https://portal.azure.com).
    - On the **Overview** page, click **Get publish profile** in the top toolbar.
    - This will download a file (e.g., `your-app-name.PublishSettings`).

3.  **Add GitHub Secret**:
    - Go to your GitHub repository.
    - Navigate to **Settings** > **Secrets and variables** > **Actions**.
    - Click **New repository secret**.
    - **Name**: `AZURE_WEBAPP_PUBLISH_PROFILE`
    - **Secret**: Open the downloaded `.PublishSettings` file with a text editor, copy the entire content, and paste it here.
    - Click **Add secret**.

## Verifying Deployment

1.  Push a change to the `main` branch.
2.  Go to the **Actions** tab in your GitHub repository.
3.  You should see a new workflow run named "Build and deploy Node.js app to Azure Web App".
4.  Click on it to see the details.
5.  Once the `deploy` job is complete, your changes should be live on your Azure Web App URL.
