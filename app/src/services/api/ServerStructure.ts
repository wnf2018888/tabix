namespace ServerStructure {
  export interface Item {
    id: string;
    name: string;
  }

  export interface Column extends Item {
    table: string;
    database: string;
    type: string;
    dataCompressedBytes: number;
    dataUncompressedBytes: number;
    defaultExpression: string;
    defaultKind: string;
    defaultType: string; // Renamed column 'default_type' to 'default_kind' in system.columns tab… · yandex/ClickHouse@8d570e2
    marksBytes: number;
  }

  export interface Table extends Item {
    insertName: string;
    database: string;
    engine: string;
    columns: ReadonlyArray<Column>;
  }

  export interface Database extends Item {
    tables: ReadonlyArray<Table>;
  }

  export class Server implements Item {
    constructor(
      public readonly id: string,
      public readonly name: string,
      public readonly databases: ReadonlyArray<Database>,
      public readonly functions: ReadonlyArray<any>,
      public readonly dictionaries: ReadonlyArray<any>,
      public readonly editorRules: Record<string, any>
    ) {
      return Object.freeze(this);
    }
  }

  // export enum ItemType {
  //   Database,
  //   Table,
  //   Column,
  // }

  // export function getItemType(item: Table | Column | Database): ItemType {
  //   if ((item as Table).database) return ItemType.Table;
  //   if ((item as Column).table) return ItemType.Column;
  //   return ItemType.Database;
  // }

  export function isDatabase(item: Table | Column | Database): item is Database {
    return !(item as Table).database && !(item as Column).table && !!(item as Database).tables;
  }

  export function isTable(item: Table | Column | Database): item is Table {
    return !!(item as Table).database && !!(item as Table).columns;
  }

  export function isColumn(item: Table | Column | Database): item is Column {
    return !!(item as Column).table && !!(item as Column).database;
  }

  export const EMPTY: Server = new Server('root', 'Clickhouse Server', [], [], [], {});

  export function from(
    columns: ReadonlyArray<Column>,
    tables: ReadonlyArray<Table>,
    databases: ReadonlyArray<Database>,
    dictionaries: any[],
    functions: any[]
  ) {
    const dbTableColumns = columns.reduce((acc, col) => {
      const column: Column = {
        ...col,
        defaultType: col.defaultKind && !col.defaultType ? col.defaultKind : col.defaultType,
        id: `${col.database}.${col.table}.${col.name}`,
      };

      acc[col.database] = acc[col.database] || {};
      acc[col.database][col.table] = acc[col.database][col.table] || [];
      acc[col.database][col.table].push(column);

      return acc;
    }, {});

    const dbTables = tables.reduce((acc, t) => {
      let tableNameTrim: string = t.name;
      if (tableNameTrim.indexOf('.') !== -1) {
        tableNameTrim = `"${tableNameTrim}"`;
      }

      acc[t.database] = acc[t.database] || [];

      if (!(!dbTableColumns[t.database] || !dbTableColumns[t.database][t.name])) {
        const table: Table = {
          ...t,
          columns: dbTableColumns[t.database][t.name] || [],
          insertName: tableNameTrim,
          id: `${t.database}.${t.name}`,
        };

        acc[t.database].push(table);
      }
      return acc;
    }, {});

    const dbList = databases.map(db => ({
      ...db,
      tables: dbTables[db.name] || [],
      id: db.name,
    }));

    const editorRules = {
      builtinFunctions: [] as any[],
      lang: 'en',
      dictionaries: [] as any[],
      tables: {} as object,
    };

    // ------------------------------- builtinFunctions -----------------------------------
    functions.forEach(item => {
      editorRules.builtinFunctions.push({
        name: item.name,
        isaggr: item.is_aggregate,
        score: 101,
        comb: false,
        origin: item.name,
      });
      if (item.is_aggregate) {
        // Комбинатор -If. Условные агрегатные функции
        let p = {
          name: `${item.name}If`,
          isaggr: item.is_aggregate,
          score: 3,
          comb: 'If',
          origin: item.name,
        };
        editorRules.builtinFunctions.push(p);

        // Комбинатор -Array. Агрегатные функции для аргументов-массивов
        p = {
          name: `${item.name}Array`,
          isaggr: item.is_aggregate,
          score: 2,
          comb: 'Array',
          origin: item.name,
        };
        editorRules.builtinFunctions.push(p);

        // Комбинатор -State. агрегатная функция возвращает промежуточное состояние агрегации
        p = {
          name: `${item.name}State`,
          isaggr: item.is_aggregate,
          score: 1,
          comb: 'State',
          origin: item.name,
        };
        editorRules.builtinFunctions.push(p);
      }
    });

    // -------------------------------- dictionaries ---------------------------------------------------
    dictionaries.forEach(item => {
      let idField = item.name;

      // Определяем id_field из item.name
      // Если id_field содержит точку вырезать все что до точки
      // Если в конце `s` вырезать
      // подставить _id и все в нижний регистр

      idField = idField.replace(/^.*\./gm, '');

      if (idField !== 'news') {
        idField = idField.replace(/s$/gm, '');
      }

      if (!idField) {
        idField = 'ID';
      } else {
        idField = `${idField.toLowerCase()}_id`;
      }

      const dic = `dictGet${item['attribute.types']}('${item.name}','${
        item['attribute.names']
      }',to${item.key}( ${idField} ) ) AS ${item['attribute.names']},`;
      editorRules.dictionaries.push({
        dic,
        title: `dic_${item.name}.${item['attribute.names']}`,
      });
    });

    editorRules.tables = dbTables;

    return new Server('root', 'Clickhouse Server', dbList, functions, dictionaries, editorRules);
  }
}

export default ServerStructure;
