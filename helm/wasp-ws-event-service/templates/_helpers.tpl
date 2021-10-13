{{/*
Create name to be used with deployment.
*/}}
{{- define "wasp-ws-event-service.fullname" -}}
    {{- if .Values.fullnameOverride -}}
        {{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" -}}
    {{- else -}}
      {{- $name := default .Chart.Name .Values.nameOverride -}}
      {{- if contains $name .Release.Name -}}
        {{- .Release.Name | trunc 63 | trimSuffix "-" -}}
      {{- else -}}
        {{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" -}}
      {{- end -}}    
    {{- end -}}
{{- end -}}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "wasp-ws-event-service.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "wasp-ws-event-service.selectorLabels" -}}
app.kubernetes.io/name: {{ include "wasp-ws-event-service.fullname" . }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "wasp-ws-event-service.labels" -}}
helm.sh/chart: {{ include "wasp-ws-event-service.chart" . }}
{{ include "wasp-ws-event-service.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Conditionally populate imagePullSecrets if present in the context
*/}}
{{- define "wasp-ws-event-service.imagePullSecrets" -}}
  {{- if (not (empty .Values.image.pullSecrets)) }}
imagePullSecrets:
    {{- range .Values.image.pullSecrets }}
  - name: {{ . }}
    {{- end }}
  {{- end }}
{{- end -}}

{{/*
Create a default fully qualified kafka broker name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
*/}}
{{- define "wasp-ws-event-service.kafka.brokers" -}}
{{- if .Values.config.kafkaBrokers -}}
{{ .Values.config.kafkaBrokers | trunc 63 | trimSuffix "-" -}}
{{- else if not ( .Values.kafka.enabled ) -}}
{{ fail "Kafka brokers must either be configured or a kafka instance enabled" }}
{{- else if .Values.kafka.fullnameOverride -}}
{{- printf "%s:9092" .Values.kafka.fullnameOverride -}}
{{- else -}}
{{- $name := default "kafka" .Values.kafka.nameOverride -}}
{{- printf "%s-%s:9092" .Release.Name $name | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}

{{- define "wasp-ws-event-service.initNotifications.name" -}}
{{- if .Values.fullnameOverride -}}
{{- printf "%s-ws-events" .Values.fullnameOverride | lower | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s-%s-ws-events" .Release.Name .Chart.Name | lower | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}
