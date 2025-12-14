# --- étape de build ---
FROM node:20-alpine AS build
WORKDIR /app

# Installation des dépendances
COPY package*.json ./
RUN npm install

# Copie du code et build
COPY . .
RUN npm run build

# --- étape de run (Nginx) ---
FROM nginx:alpine
WORKDIR /usr/share/nginx/html

# Copie des fichiers statiques construits
# ⚠️ si ton outil génère un dossier "build" et non "dist",
# remplace /app/dist par /app/build.
COPY --from=build /app/dist ./

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
