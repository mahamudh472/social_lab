from locust import HttpUser, task, between

class WebsiteUser(HttpUser):
    wait_time = between(1, 5)  # wait 1-5 seconds between tasks
    @task
    def on_start(self):
        response = self.client.post("/api/auth/login/", json={"username":"Mahmud2", "password":"A1B2C3D4@"})
        if response.status_code != 200:
            print("Login failed!")

        else:
            self.token = response.json().get("access")

    @task
    def chats(self):
        headers = {"Authorization": f"Bearer {self.token}"}
        self.client.get("/api/chats/", headers=headers)
