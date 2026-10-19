import { Inject, Injectable } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import { DRIZZLE } from '../../infrastructure/database/database.module';
import { type DrizzleClient } from '../../infrastructure/database/db';
import { routes, NewRoute, Route } from './routes.schema';

@Injectable()
export class RoutesRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleClient) {}

  async findAll(limit: number, offset: number): Promise<Route[]> {
    return this.db
      .select()
      .from(routes)
      .orderBy(desc(routes.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async findById(id: string): Promise<Route | undefined> {
    const result = await this.db
      .select()
      .from(routes)
      .where(eq(routes.id, id))
      .limit(1);

    return result[0];
  }

  async findActive(): Promise<Route[]> {
    return this.db
      .select()
      .from(routes)
      .where(eq(routes.isCompleted, false))
      .orderBy(desc(routes.createdAt));
  }

  async create(data: NewRoute): Promise<Route> {
    const result = await this.db.insert(routes).values(data).returning();

    return result[0];
  }

  async markCompleted(id: string): Promise<Route | undefined> {
    const result = await this.db
      .update(routes)
      .set({ isCompleted: true })
      .where(eq(routes.id, id))
      .returning();

    return result[0];
  }

  async delete(id: string): Promise<Route | undefined> {
    const result = await this.db
      .delete(routes)
      .where(eq(routes.id, id))
      .returning();

    return result[0];
  }
}
