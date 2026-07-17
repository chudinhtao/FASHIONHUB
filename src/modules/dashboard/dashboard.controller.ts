import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Role } from '@prisma/client';

@Controller('admin/dashboard')
@UseGuards(RolesGuard)
@Roles(Role.ADMIN)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  async getStats(
    @Query('range') range: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const data = await this.dashboardService.getStats(range, startDate, endDate);
    return {
      statusCode: 200,
      message: 'Lấy dữ liệu thống kê thành công',
      data,
    };
  }

  @Get('top-products')
  async getTopProducts() {
    const data = await this.dashboardService.getTopProducts();
    return {
      statusCode: 200,
      message: 'Lấy danh sách sản phẩm bán chạy thành công',
      data,
    };
  }

  @Get('recent-activities')
  async getRecentActivities() {
    const data = await this.dashboardService.getRecentActivities();
    return {
      statusCode: 200,
      message: 'Lấy hoạt động gần đây thành công',
      data,
    };
  }
}
