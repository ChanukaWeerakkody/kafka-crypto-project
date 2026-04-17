# Deployment Guide

This guide covers production deployment strategies for the Crypto Kafka Streaming Platform.

## Prerequisites

### Infrastructure Requirements
- **Minimum**: 2 CPU cores, 4GB RAM, 20GB storage
- **Recommended**: 4 CPU cores, 8GB RAM, 50GB storage
- **Kafka Broker**: External Kafka cluster (Aiven, Confluent Cloud, or self-hosted)
- **Load Balancer**: For dashboard service (if using multiple instances)
- **SSL Certificates**: For secure connections

### Software Requirements
- Docker >= 20.10.0
- Docker Compose >= 2.0.0
- Node.js >= 18.0.0 (for local deployment)
- Git for source control

## Environment Setup

### 1. Production Environment Variables
Create a production `.env` file:

```bash
# Kafka Configuration
KAFKA_BOOTSTRAP_SERVERS=kafka-cluster.example.com:9093
KAFKA_USERNAME=production_user
KAFKA_PASSWORD=secure_password_here
KAFKA_CLIENT_ID=crypto-prod-service
KAFKA_SSL_REJECT_UNAUTHORIZED=true
KAFKA_CA_CERT=/app/certs/ca.pem

# Server Configuration
SERVER_PORT=3000
SERVER_HOST=0.0.0.0
CORS_ORIGIN=https://dashboard.example.com

# Producer Configuration
KAFKA_TOPIC=crypto-prices
PRODUCER_INTERVAL_MS=1000
KAFKA_PARTITIONER=LegacyPartitioner

# Consumer Configuration
KAFKA_CONSUMER_GROUP_ID=crypto-prod-consumer-group
KAFKA_CONSUMER_FROM_BEGINNING=false

# Logging Configuration
LOG_LEVEL=warn
LOG_FORMAT=json

# Monitoring Configuration
MONITORING_ENABLED=true
METRICS_PORT=9090

# Environment
NODE_ENV=production
```

### 2. SSL Certificate Setup
```bash
# Create certificates directory
mkdir -p certs

# Copy your CA certificate
cp path/to/ca.pem certs/ca.pem

# Set proper permissions
chmod 600 certs/ca.pem
```

## Deployment Options

### Option 1: Docker Compose (Recommended for Small-Medium Scale)

#### 1.1 Prepare Production Docker Compose
```bash
# Use production compose file
docker-compose -f docker-compose.yml up -d
```

#### 1.2 Scale Services
```bash
# Scale dashboard for high availability
docker-compose up -d --scale crypto-dashboard=3

# Scale consumers for parallel processing
docker-compose up -d --scale crypto-consumer=2
```

#### 1.3 Health Monitoring
```bash
# Check service health
docker-compose ps

# View logs
docker-compose logs -f crypto-dashboard

# Monitor resource usage
docker stats
```

### Option 2: Kubernetes (Recommended for Large Scale)

#### 2.1 Create Kubernetes Manifests

**Namespace:**
```yaml
# k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: crypto-platform
```

**ConfigMap:**
```yaml
# k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: crypto-config
  namespace: crypto-platform
data:
  KAFKA_TOPIC: "crypto-prices"
  PRODUCER_INTERVAL_MS: "1000"
  LOG_LEVEL: "warn"
  LOG_FORMAT: "json"
  NODE_ENV: "production"
```

**Secret:**
```yaml
# k8s/secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: crypto-secrets
  namespace: crypto-platform
type: Opaque
data:
  KAFKA_USERNAME: <base64-encoded>
  KAFKA_PASSWORD: <base64-encoded>
  KAFKA_BOOTSTRAP_SERVERS: <base64-encoded>
```

**Producer Deployment:**
```yaml
# k8s/producer-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: crypto-producer
  namespace: crypto-platform
spec:
  replicas: 2
  selector:
    matchLabels:
      app: crypto-producer
  template:
    metadata:
      labels:
        app: crypto-producer
    spec:
      containers:
      - name: producer
        image: kafka-crypto-prod:latest
        command: ["node", "src/applications/producer.js"]
        envFrom:
        - configMapRef:
            name: crypto-config
        - secretRef:
            name: crypto-secrets
        resources:
          requests:
            memory: "128Mi"
            cpu: "250m"
          limits:
            memory: "256Mi"
            cpu: "500m"
        livenessProbe:
          exec:
            command: ["node", "-e", "console.log('healthy')"]
          initialDelaySeconds: 30
          periodSeconds: 30
        readinessProbe:
          exec:
            command: ["node", "-e", "console.log('ready')"]
          initialDelaySeconds: 5
          periodSeconds: 10
```

**Dashboard Service:**
```yaml
# k8s/dashboard-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: crypto-dashboard-service
  namespace: crypto-platform
spec:
  selector:
    app: crypto-dashboard
  ports:
  - port: 80
    targetPort: 3000
  type: LoadBalancer
```

#### 2.2 Deploy to Kubernetes
```bash
# Apply all manifests
kubectl apply -f k8s/

# Check deployment status
kubectl get pods -n crypto-platform

# Check services
kubectl get services -n crypto-platform

# View logs
kubectl logs -f deployment/crypto-producer -n crypto-platform
```

### Option 3: Cloud Native Services

#### 3.1 AWS ECS
```bash
# Create ECS task definition
aws ecs register-task-definition --cli-input-json file://task-definition.json

# Create service
aws ecs create-service --cluster crypto-cluster --service-name crypto-dashboard --task-definition crypto-dashboard:1

# Update service
aws ecs update-service --cluster crypto-cluster --service-name crypto-dashboard --desired-count 3
```

#### 3.2 Google Cloud Run
```bash
# Build and push image
gcloud builds submit --tag gcr.io/project-id/crypto-dashboard

# Deploy service
gcloud run deploy crypto-dashboard --image gcr.io/project-id/crypto-dashboard --platform managed
```

## Monitoring and Observability

### 1. Health Checks
```bash
# Application health endpoint
curl https://dashboard.example.com/api/health

# Kubernetes health checks
kubectl get pods -n crypto-platform -o wide

# Docker health checks
docker inspect crypto-dashboard --format='{{.State.Health.Status}}'
```

### 2. Log Management
```bash
# View structured logs
docker-compose logs -f crypto-dashboard | jq '.'

# Kubernetes logs
kubectl logs -f deployment/crypto-dashboard -n crypto-platform --tail=100

# Log aggregation setup (ELK stack)
# Add filebeat configuration for log collection
```

### 3. Metrics Collection
```bash
# Application metrics
curl http://localhost:9090/metrics

# Prometheus monitoring
# Add prometheus.yml configuration for scraping
```

## Security Hardening

### 1. Network Security
```bash
# Firewall rules
ufw allow 3000/tcp
ufw allow from kafka-server-ip to any port 9092

# Kubernetes network policies
kubectl apply -f k8s/network-policy.yaml
```

### 2. Container Security
```bash
# Scan images for vulnerabilities
docker scan kafka-crypto-prod:latest

# Use non-root containers (already configured)
# Read-only filesystem
# Resource limits
```

### 3. Secrets Management
```bash
# Use Kubernetes secrets
kubectl create secret generic crypto-secrets --from-literal=password=secret

# Use AWS Secrets Manager
aws secretsmanager create-secret --name crypto-kafka-credentials

# Use HashiCorp Vault
vault kv put secret/crypto/kafka username=admin password=secret
```

## Performance Optimization

### 1. Kafka Optimization
```bash
# Increase partitions for parallelism
kafka-topics.sh --bootstrap-server kafka:9092 --alter --topic crypto-prices --partitions 10

# Optimize consumer lag monitoring
kafka-consumer-groups.sh --bootstrap-server kafka:9092 --describe --group crypto-prod-consumer-group
```

### 2. Application Optimization
```bash
# Tune JVM (if using Java-based services)
# Optimize Node.js memory
NODE_OPTIONS="--max-old-space-size=512"

# Enable compression
# Implement caching
```

### 3. Infrastructure Optimization
```bash
# Use SSD storage
# Configure proper resource limits
# Implement horizontal pod autoscaler
kubectl autoscale deployment crypto-dashboard --cpu-percent=70 --min=2 --max=10
```

## Backup and Disaster Recovery

### 1. Data Backup
```bash
# Kafka topic backup
kafka-console-consumer.sh --bootstrap-server kafka:9092 --topic crypto-prices --from-beginning > backup.json

# Configuration backup
kubectl get configmaps -n crypto-platform -o yaml > config-backup.yaml
```

### 2. Disaster Recovery
```bash
# Restore from backup
kafka-console-producer.sh --bootstrap-server kafka:9092 --topic crypto-prices < backup.json

# Restore configuration
kubectl apply -f config-backup.yaml
```

## Troubleshooting

### Common Production Issues

#### 1. Kafka Connection Issues
```bash
# Check connectivity
nc -zv kafka-server 9092

# Verify SSL
openssl s_client -connect kafka-server:9093 -servername kafka-server

# Check consumer lag
kafka-consumer-groups.sh --bootstrap-server kafka:9092 --describe --group crypto-prod-consumer-group
```

#### 2. High Memory Usage
```bash
# Check container memory
docker stats crypto-dashboard

# Kubernetes memory usage
kubectl top pods -n crypto-platform

# Node.js memory profiling
node --inspect src/applications/dashboard.js
```

#### 3. Dashboard Not Loading
```bash
# Check service status
curl -I http://localhost:3000/api/health

# Check WebSocket connection
wscat -c ws://localhost:3000/socket.io/

# Check CORS headers
curl -H "Origin: https://example.com" -I http://localhost:3000/api/health
```

## Maintenance

### 1. Rolling Updates
```bash
# Docker Compose rolling update
docker-compose up -d --no-deps crypto-dashboard

# Kubernetes rolling update
kubectl set image deployment/crypto-dashboard crypto-dashboard=kafka-crypto-prod:v2 -n crypto-platform
```

### 2. Scheduled Maintenance
```bash
# Create maintenance window script
#!/bin/bash
# Scale down services
kubectl scale deployment crypto-dashboard --replicas=0 -n crypto-platform

# Perform maintenance
# ...

# Scale back up
kubectl scale deployment crypto-dashboard --replicas=3 -n crypto-platform
```

## Compliance and Auditing

### 1. Logging Compliance
```bash
# Ensure logs are retained for required period
# Implement log rotation
# Add audit logging for sensitive operations
```

### 2. Security Auditing
```bash
# Regular security scans
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock aquasec/trivy image kafka-crypto-prod:latest

# Network security audits
# Access control reviews
```

This deployment guide provides comprehensive instructions for deploying the Crypto Kafka Streaming Platform in production environments. Choose the deployment option that best fits your scale and infrastructure requirements.
