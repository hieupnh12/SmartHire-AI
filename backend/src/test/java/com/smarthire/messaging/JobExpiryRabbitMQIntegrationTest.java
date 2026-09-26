package com.smarthire.messaging;

import com.smarthire.tenant.job.service.JobService;
import org.junit.jupiter.api.Test;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import static org.mockito.Mockito.*;

@SpringBootTest
public class JobExpiryRabbitMQIntegrationTest {

    @Autowired
    private RabbitTemplate rabbitTemplate;

    @MockBean
    private JobService jobService;

    @Value("${app.rabbitmq.exchanges.job-expiry}")
    private String jobExpiryExchange;

    @Test
    public void testDelayedJobExpiryMessage_DeliveredAfterDelay() throws InterruptedException {
        // 1. Chuẩn bị dữ liệu
        long testJobId = 9999L;
        String tenantId = "koko";
        int delayMs = 3000; // Thiết lập độ trễ 3 giây

        // 2. Gửi tin nhắn hẹn giờ vào RabbitMQ
        rabbitTemplate.convertAndSend(jobExpiryExchange, com.smarthire.config.RabbitMqConfig.RK, testJobId, message -> {
            message.getMessageProperties().setDelay(delayMs);
            message.getMessageProperties().setHeader("X-Tenant-ID", tenantId);
            return message;
        });

        // 3. Kiểm tra ngay lập tức: Hàm đóng Job CHƯA được gọi vì tin nhắn đang bị "giam" trong RabbitMQ
        verify(jobService, never()).closeIfExpired(testJobId);

        System.out.println("Message sent with 3s delay. Waiting...");

        // 4. Chờ 4 giây (đợi tin nhắn hết hạn delay và được gửi tới Consumer)
        Thread.sleep(4000);

        // 5. Kiểm tra lại: Hàm đóng Job ĐÃ ĐƯỢC GỌI đúng 1 lần sau khi hết thời gian trễ
        verify(jobService, times(1)).closeIfExpired(testJobId);
        
        System.out.println("Integration Test cho RabbitMQ Delayed Message THÀNH CÔNG! 🎉");
    }
}
