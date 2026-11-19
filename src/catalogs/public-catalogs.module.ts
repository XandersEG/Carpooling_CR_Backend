
import { Module } from '@nestjs/common';

import { PublicCatalogsController } from './public-catalogs.controller.js';

@Module({
  controllers: [PublicCatalogsController],
})
export class PublicCatalogsModule {}
