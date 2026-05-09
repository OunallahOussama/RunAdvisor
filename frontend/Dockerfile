FROM node:18-alpine as builder

WORKDIR /app

ARG REACT_APP_API_BASE_URL
ARG REACT_APP_STRAVA_CLIENT_ID
ARG REACT_APP_STRAVA_REDIRECT_URI
ENV REACT_APP_API_BASE_URL=$REACT_APP_API_BASE_URL
ENV REACT_APP_STRAVA_CLIENT_ID=$REACT_APP_STRAVA_CLIENT_ID
ENV REACT_APP_STRAVA_REDIRECT_URI=$REACT_APP_STRAVA_REDIRECT_URI

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Install serve to run the React app
RUN npm install -g serve

# Copy built files from builder
COPY --from=builder /app/build ./build

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000 || exit 1

CMD ["serve", "-s", "build", "-l", "3000"]
