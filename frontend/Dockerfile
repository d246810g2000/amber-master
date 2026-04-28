# Build stage
FROM node:20-slim AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
# We need to pass the API URL at build time if we want it hardcoded, 
# or use a runtime config. For Vite, VITE_ variables are baked in at build time.
# For local testing, we can use a default or pass it via build-arg.
ARG VITE_API_URL=http://localhost:8000
ARG VITE_GOOGLE_CLIENT_ID
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID

RUN npm run build

# Production stage
FROM nginx:stable-alpine

COPY --from=build /app/dist /usr/share/nginx/html/amber-master

# Copy custom nginx config template for dynamic backend routing
COPY nginx.conf /etc/nginx/templates/default.conf.template

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
