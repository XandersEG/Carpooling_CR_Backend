import { describe, expect, it } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';

import { HistoryService } from './history.service.js';

// ids que no tienen el formato c-<n> o p-<n> se rechazan sin consultar la base
describe('HistoryService.detalle', () => {
  const service = new HistoryService();

  it.each(['', 'abc', 'x-1', 'c-', 'c-0', 'p--1', 'c-99999999999', 'c-1; drop table viaje'])(
    'responde 404 para el id "%s"',
    async (id) => {
      await expect(service.detalle(1, id)).rejects.toBeInstanceOf(NotFoundException);
    },
  );
});
