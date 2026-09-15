# Inserir autorização de espelho da Paola

1. Executar uma única vez, pela ferramenta de alteração de dados do banco, exatamente o `INSERT` fornecido.
2. Não criar migration nem alterar arquivos, funções, configurações ou outros dados.
3. Retornar somente o `id` gerado pela inserção.

## Validação

- A própria cláusula `RETURNING id` confirmará a criação da única autorização solicitada.
- Se o comando falhar, interromper sem repetir a inserção e informar apenas o erro.
