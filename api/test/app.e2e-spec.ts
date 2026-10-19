import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';

describe('Backend security (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('blocks unauthenticated access to protected endpoints', () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    return request(server).get('/vehicles').expect(401);
  });

  it('blocks unauthenticated access to route directions', () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    return request(server)
      .post('/routes/directions')
      .send({
        coordinates: [
          [29.023, 40.99],
          [29.0556, 40.9713],
        ],
      })
      .expect(401);
  });
});
