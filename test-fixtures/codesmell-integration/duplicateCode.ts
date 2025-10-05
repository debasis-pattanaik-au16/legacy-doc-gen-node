export class ReportGenerator {
  generateUserReport(userId: string) {
    const user = this.getUser(userId);
    const data = this.getData(user);
    const formatted = this.formatData(data);
    this.saveReport(formatted);
    this.sendEmail(user.email, 'Report ready');
    return formatted;
  }
  
  generateAdminReport(adminId: string) {
    const admin = this.getUser(adminId);
    const data = this.getData(admin);
    const formatted = this.formatData(data);
    this.saveReport(formatted);
    this.sendEmail(admin.email, 'Report ready');
    return formatted;
  }
  
  private getUser(id: string) { return null; }
  private getData(user: any) { return null; }
  private formatData(data: any) { return null; }
  private saveReport(report: any) { }
  private sendEmail(email: string, message: string) { }
}