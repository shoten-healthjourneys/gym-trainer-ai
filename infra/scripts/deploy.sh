#!/usr/bin/env bash
set -euo pipefail

# Deploy script for GymTrainer API
# Builds Docker image, pushes to ACR, and updates Container App revision
#
# Required environment variables:
#   ACR_NAME       — Azure Container Registry name (e.g. gymtraineracr)
#   ACA_NAME       — Container App name (e.g. gym-trainer-api)
#   RESOURCE_GROUP — Azure resource group (e.g. gym-trainer-rg)

: "${ACR_NAME:?ACR_NAME environment variable is required}"
: "${ACA_NAME:?ACA_NAME environment variable is required}"
: "${RESOURCE_GROUP:?RESOURCE_GROUP environment variable is required}"

IMAGE_TAG="${IMAGE_TAG:-latest}"
IMAGE_NAME="${ACR_NAME}.azurecr.io/gym-trainer-api:${IMAGE_TAG}"

echo "==> Logging in to ACR: ${ACR_NAME}"
az acr login --name "${ACR_NAME}"

echo "==> Building Docker image: ${IMAGE_NAME}"
docker build -t "${IMAGE_NAME}" ../backend/

echo "==> Pushing image to ACR"
docker push "${IMAGE_NAME}"

echo "==> Updating Container App: ${ACA_NAME}"
az containerapp update \
  --name "${ACA_NAME}" \
  --resource-group "${RESOURCE_GROUP}" \
  --image "${IMAGE_NAME}"

echo "==> Deployment complete"
