# Pagamentos

`server/src/payments/` define a interface comum para checkout, cancelamento e webhook. O `MockProvider` serve apenas para desenvolvimento. O adaptador Mercado Pago usa checkout hospedado e valida `x-signature` com HMAC antes de consultar o pagamento.

Configure `PAYMENT_PROVIDER=mercadopago`, token privado, segredo de webhook e URLs HTTPS no ambiente do servidor. Eventos devem ser idempotentes: o identificador externo é persistido antes de aplicar a transição de assinatura. Nunca grave dados de cartão no banco ou no cliente.
