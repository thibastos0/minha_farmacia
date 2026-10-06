# 💊 Minha Farmácia — Indaiatuba

> **Projeto desenvolvido durante o Hackathon Fatec Indaiatuba 2026**  
> **Desafio:** 2.3) Minha Farmácia — Secretaria de Ciência, Tecnologia e Inovação

---

## 📌 Visão Geral

O **Minha Farmácia** é uma extensão do ecossistema [Minha Indaiatuba](https://minha.indaiatuba.sp.gov.br/), criada para digitalizar e democratizar o acesso a medicamentos da rede pública municipal. A plataforma conecta munícipes, farmácias municipais/farmacêuticos e entregadores em uma experiência inspirada em aplicativos de delivery moderno.

---

## 🚀 Arquitetura da Solução

O sistema é composto por 3 interfaces principais e um motor de automação com IA:

1. **App Munícipe (React Native):** Consulta de estoque, envio de receitas, solicitação de remédios e rastreamento em tempo real.
2. **Painel do Farmacêutico & Gestão (Web / Dashboard):** Análise assistida por IA de receitas, triagem, controle de estoque e mapa de calor de entregas.
3. **App/Módulo do Entregador (React Native / PWA):** Aceite de corridas, roteirização e confirmação de entrega via código OTP.
4. **Motor de Inteligência & Automação (n8n + AI Vision):** Extração e validação automática de dados de receitas médicas.

---

## 🔄 Fluxo de Funcionamento (End-to-End)

```mermaid
sequenceDiagram
    autonumber
    actor M as Munícipe
    participant APP as App Minha Farmácia
    participant N8N as n8n (AI OCR)
    participant FAR as Painel Farmacêutico
    participant ENT as App Entregador
    
    M->>APP: Login (gov.br) + Solicita Medicamento + Foto da Receita
    APP->>N8N: Envia Imagem + Dados do Formulário
    N8N->>N8N: Extrai CRM, Médico, Medicamentos via OCR
    N8N->>FAR: Preenche pré-análise com Alertas
    FAR->>FAR: Farmacêutico Aprova/Reprova
    FAR-->>M: Notificação WhatsApp/Push ("Aprovado")
    FAR->>ENT: Dispara notificação de entrega disponível
    ENT->>FAR: Entregador aceita a corrida
    ENT->>M: Rastreamento via GPS em tempo real
    ENT->>M: Confirmação via Código OTP + Recolha de receita física (se necessário)
    ENT->>FAR: Baixa final no sistema

