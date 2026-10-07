import app from '@adonisjs/core/services/app'
import env from '#start/env'
import { defineConfig } from '@adonisjs/lucid'
import pg from 'pg'

/**
 * Las columnas `date` llegan como el texto `AAAA-MM-DD` que guarda Postgres, no
 * como un `Date` (que es lo que hace `pg` por defecto, a medianoche del huso del
 * servidor). Una fecha de vencimiento es un día del calendario, no un instante:
 * `Task.isOverdueOn` la compara como texto y `database/schema_rules.ts` la
 * declara `string`. Sin esto, el tipo declarado miente y la comparación da
 * `false` siempre. 1082 es el OID de `date` en Postgres.
 *
 * Es global al proceso y afecta a todas las columnas `date` que se añadan.
 */
pg.types.setTypeParser(1082, (value: string) => value)

const dbConfig = defineConfig({
  /**
   * Default connection used for all queries.
   */
  connection: 'pg',

  connections: {
    /**
     * SQLite connection. Ya no es la de por defecto; se conserva por si hace
     * falta volver a ella.
     */
    sqlite: {
      client: 'better-sqlite3',

      connection: {
        filename: app.tmpPath('db.sqlite3'),
      },

      /**
       * Required by Knex for SQLite defaults.
       */
      useNullAsDefault: true,

      migrations: {
        /**
         * Sort migration files naturally by filename.
         */
        naturalSort: true,

        /**
         * Paths containing migration files.
         */
        paths: ['database/migrations'],
      },

      schemaGeneration: {
        /**
         * Enable schema generation from Lucid models.
         */
        enabled: true,

        /**
         * Custom schema rules file paths.
         */
        rulesPaths: ['./database/schema_rules.js'],
      },
    },

    /**
     * PostgreSQL connection (default). Las bases viven en Docker, ver
     * compose.yaml: desarrollo en el 54410, pruebas en el 54411 (.env.test).
     */
    pg: {
      client: 'pg',
      connection: {
        host: env.get('DB_HOST'),
        port: env.get('DB_PORT'),
        user: env.get('DB_USER'),
        password: env.get('DB_PASSWORD').release(),
        database: env.get('DB_DATABASE'),
      },
      migrations: {
        naturalSort: true,
        paths: ['database/migrations'],
      },
      debug: app.inDev,

      schemaGeneration: {
        /**
         * Enable schema generation from Lucid models.
         */
        enabled: true,

        /**
         * Custom schema rules file paths.
         */
        rulesPaths: ['./database/schema_rules.js'],
      },
    },

    /**
     * MySQL / MariaDB connection.
     * Install package to switch: npm install mysql2
     */
    // mysql: {
    //   client: 'mysql2',
    //   connection: {
    //     host: env.get('DB_HOST'),
    //     port: env.get('DB_PORT'),
    //     user: env.get('DB_USER'),
    //     password: env.get('DB_PASSWORD').release(),
    //     database: env.get('DB_DATABASE'),
    //   },
    //   migrations: {
    //     naturalSort: true,
    //     paths: ['database/migrations'],
    //   },
    //   debug: app.inDev,
    // },

    /**
     * Microsoft SQL Server connection.
     * Install package to switch: npm install tedious
     */
    // mssql: {
    //   client: 'mssql',
    //   connection: {
    //     server: env.get('DB_HOST'),
    //     port: env.get('DB_PORT'),
    //     user: env.get('DB_USER'),
    //     password: env.get('DB_PASSWORD').release(),
    //     database: env.get('DB_DATABASE'),
    //   },
    //   migrations: {
    //     naturalSort: true,
    //     paths: ['database/migrations'],
    //   },
    //   debug: app.inDev,
    // },

    /**
     * libSQL (Turso) connection.
     * Install package to switch: npm install @libsql/client
     */
    // libsql: {
    //   client: 'libsql',
    //   connection: {
    //     url: env.get('LIBSQL_URL'),
    //     authToken: env.get('LIBSQL_AUTH_TOKEN'),
    //   },
    //   useNullAsDefault: true,
    //   migrations: {
    //     naturalSort: true,
    //     paths: ['database/migrations'],
    //   },
    //   debug: app.inDev,
    // },
  },
})

export default dbConfig
