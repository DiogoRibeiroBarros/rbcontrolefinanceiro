# Segurança

- Senhas são armazenadas com Argon2id; tokens persistidos ficam apenas como digest.
- O PIN legado SHA-256 é aceito uma vez para migração e convertido para PBKDF2 com salt aleatório.
- O desktop exige contexto seguro, valida remetente IPC e não aceita token de sessão em URL.
- Pairing é temporário, limitado por tentativas e expira; tokens antigos só têm compatibilidade controlada durante a migração.
- O cache mobile é autenticado com AES-GCM e falha sem sobrescrever o arquivo anterior quando há corrupção.
- Webhooks validam assinatura antes de alterar cobrança.

Em produção, configure HTTPS, SMTP real, PostgreSQL gerenciado, rotação de segredos, backups criptografados, logs sem dados financeiros e code signing do instalador. A API recusa inicialização com configuração mock ou incompleta em produção.
