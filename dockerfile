# FROM node:16.13.0-alpine3.11 AS base
# WORKDIR /app
# COPY package*.json /app/
# RUN npm install
# COPY . .
# EXPOSE 3030

# #RUN apk update && apk add bash
# #RUN wget https://github.com/vishnubob/wait-for-it/raw/master/wait-for-it.sh -O wait-for-it.sh && chmod +x wait-for-it.sh

# Use node 16 base image with alpine 3.11
FROM node:16.13.0-alpine3.11 AS base

# Set working directory
WORKDIR /app

# Install dependencies
COPY package*.json /app/
RUN apk add --no-cache python3 make g++ && npm install

# Copy rest of the application code
COPY . .

# Expose port
EXPOSE 3030

# Uncomment if you need bash and wait-for-it
#RUN apk update && apk add bash
#RUN wget https://github.com/vishnubob/wait-for-it/raw/master/wait-for-it.sh -O wait-for-it.sh && chmod +x wait-for-it.sh

# Start the application
CMD ["npm", "start"]
