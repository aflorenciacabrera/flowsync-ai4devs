import { type SchemaRules } from '@adonisjs/lucid/types/schema_generator'

export default {
  tables: {
    tasks: {
      columns: {
        /**
         * En la base de datos `status` es un `varchar`, así que el generador lo
         * tiparía como `string`. Se estrecha a la unión de los tres estados
         * para que el conjunto cerrado se compruebe también en compilación.
         */
        status: {
          tsType: 'TaskStatus',
          imports: [{ source: '#models/task_status', typeImports: ['TaskStatus'] }],
        },
      },
    },
  },
} satisfies SchemaRules
