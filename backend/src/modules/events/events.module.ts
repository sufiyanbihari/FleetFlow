import { Global, Module } from '@nestjs/common';
import { FleetGateway } from './fleet.gateway';
import { AuthModule } from '../auth/auth.module';

@Global()
@Module({
  imports: [AuthModule], // provides JwtService for socket handshake validation
  providers: [FleetGateway],
  exports: [FleetGateway],
})
export class EventsModule {}
