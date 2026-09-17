package com.industrypm.apigateway;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.web.reactive.AutoConfigureWebTestClient;
import org.springframework.cloud.gateway.route.Route;
import org.springframework.cloud.gateway.route.RouteLocator;
import org.springframework.test.web.reactive.server.WebTestClient;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureWebTestClient
class ApiGatewayApplicationTests {

    @org.springframework.beans.factory.annotation.Autowired
    private WebTestClient webTestClient;

    @org.springframework.beans.factory.annotation.Autowired
    private RouteLocator routeLocator;

    @Test
    void contextLoads() {
        // If the Spring context fails to start, this test fails automatically.
    }

    @Test
    void actuatorHealthReturnsOk() {
        webTestClient.get()
                .uri("/actuator/health")
                .exchange()
                .expectStatus().isOk();
    }

    @Test
    void gatewayConfiguresExpectedRoutes() {
        List<Route> routes = routeLocator.getRoutes().collectList().block();
        assertThat(routes).isNotNull();

        Set<String> routeIds = routes.stream()
                .map(Route::getId)
                .collect(Collectors.toSet());

        assertThat(routeIds).containsExactlyInAnyOrder(
                "auth-service",
                "project-service",
                "task-service",
                "notification-service"
        );
    }
}
