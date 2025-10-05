export class UserService {
  // This is a long method (>50 lines) - should be detected
  async processUserData(userId: string) {
    console.log('Starting user processing');
    const user = await this.getUser(userId);
    
    if (!user) {
      throw new Error('User not found');
    }
    
    // Validate user data
    if (!user.email || !user.name) {
      throw new Error('Invalid user data');
    }
    
    // Process email
    const emailParts = user.email.split('@');
    if (emailParts.length !== 2) {
      throw new Error('Invalid email');
    }
    
    // More processing...
    const domain = emailParts[1];
    const username = emailParts[0];
    
    // Validate domain
    if (!domain.includes('.')) {
      throw new Error('Invalid domain');
    }
    
    // More validation...
    console.log('Validating user permissions');
    
    // Check permissions
    if (user.role === 'admin') {
      console.log('Admin user detected');
    } else if (user.role === 'moderator') {
      console.log('Moderator user detected');
    } else {
      console.log('Regular user detected');
    }
    
    // Process data
    console.log('Processing data');
    const processedData = {
      id: user.id,
      name: user.name,
      email: user.email,
      domain: domain,
      username: username
    };
    
    // Save to database
    console.log('Saving to database');
    await this.saveToDatabase(processedData);
    
    // Send notifications
    console.log('Sending notifications');
    await this.sendEmail(user.email, 'Data processed');
    
    // Log activity
    console.log('Logging activity');
    await this.logActivity(userId, 'data_processed');
    
    return processedData;
  }
  
  private async getUser(userId: string) { return null; }
  private async saveToDatabase(data: any) { }
  private async sendEmail(email: string, message: string) { }
  private async logActivity(userId: string, action: string) { }
}